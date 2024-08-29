// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface INodeSocialAvatar {
    function mintAvatar(string memory tokenURI) external returns (uint256);
    function getAvatarInfo(uint256 tokenId) external view returns (uint8, uint256);
}

contract NodeSocialProfile is ERC721, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    IERC20 public platformToken;
    address public postContractAddress;
    INodeSocialAvatar public avatarContract;

    Counters.Counter private _profileIds;

    struct Profile {
        uint256 id;
        string username;
        string bioHash;
        uint256 reputation;
        uint256[] posts;
        uint256[] comments;
        address[] followers;
        address[] following;
        bool isVerified;
        uint256 verificationTimestamp;
        address avatarContract;
        uint256 avatarId;
        string[] skills;
        mapping(string => uint256) skillLevels;
    }

    mapping(address => Profile) public profiles;
    mapping(string => address) public usernameToAddress;
    mapping(address => mapping(address => bool)) public isFollowing;

    event ProfileCreated(uint256 indexed profileId, address indexed owner, string username);
    event ProfileUpdated(uint256 indexed profileId, address indexed owner);
    event UserFollowed(address indexed follower, address indexed followed);
    event UserUnfollowed(address indexed follower, address indexed unfollowed);
    event ReputationChanged(address indexed user, int256 change, uint256 newReputation);
    event ProfileVerified(address indexed user, uint256 timestamp);
    event AvatarSet(address indexed user, address avatarContract, uint256 avatarId);
    event SkillAdded(address indexed user, string skill, uint256 level);
    event SkillUpdated(address indexed user, string skill, uint256 newLevel);

    constructor(address _platformTokenAddress, address _postContractAddress, address _avatarContractAddress, address initialOwner) 
        ERC721("NodeSocialProfile", "NSProfile") 
        Ownable(initialOwner)
    {
        platformToken = IERC20(_platformTokenAddress);
        postContractAddress = _postContractAddress;
        avatarContract = INodeSocialAvatar(_avatarContractAddress);
    }



    function createProfile(string memory _username, string memory _bioHash) external {
        require(profiles[msg.sender].id == 0, "Profile already exists");
        require(usernameToAddress[_username] == address(0), "Username already taken");

        _profileIds.increment();
        uint256 newProfileId = _profileIds.current();

        Profile storage newProfile = profiles[msg.sender];
        newProfile.id = newProfileId;
        newProfile.username = _username;
        newProfile.bioHash = _bioHash;
        newProfile.reputation = 0;

        usernameToAddress[_username] = msg.sender;

        _safeMint(msg.sender, newProfileId);

        emit ProfileCreated(newProfileId, msg.sender, _username);
    }

    function updateProfile(string memory _newBioHash) external {
        require(profiles[msg.sender].id != 0, "Profile does not exist");

        profiles[msg.sender].bioHash = _newBioHash;

        emit ProfileUpdated(profiles[msg.sender].id, msg.sender);
    }

    function followUser(address _userToFollow) external {
        require(profiles[msg.sender].id != 0, "Profile does not exist");
        require(profiles[_userToFollow].id != 0, "User to follow does not exist");
        require(!isFollowing[msg.sender][_userToFollow], "Already following this user");
        require(msg.sender != _userToFollow, "Cannot follow yourself");

        profiles[msg.sender].following.push(_userToFollow);
        profiles[_userToFollow].followers.push(msg.sender);
        isFollowing[msg.sender][_userToFollow] = true;

        emit UserFollowed(msg.sender, _userToFollow);
    }

    function unfollowUser(address _userToUnfollow) external {
        require(isFollowing[msg.sender][_userToUnfollow], "Not following this user");

        // Remove from following array
        Profile storage followerProfile = profiles[msg.sender];
        for (uint i = 0; i < followerProfile.following.length; i++) {
            if (followerProfile.following[i] == _userToUnfollow) {
                followerProfile.following[i] = followerProfile.following[followerProfile.following.length - 1];
                followerProfile.following.pop();
                break;
            }
        }

        // Remove from followers array
        Profile storage unfollowedProfile = profiles[_userToUnfollow];
        for (uint i = 0; i < unfollowedProfile.followers.length; i++) {
            if (unfollowedProfile.followers[i] == msg.sender) {
                unfollowedProfile.followers[i] = unfollowedProfile.followers[unfollowedProfile.followers.length - 1];
                unfollowedProfile.followers.pop();
                break;
            }
        }

        isFollowing[msg.sender][_userToUnfollow] = false;

        emit UserUnfollowed(msg.sender, _userToUnfollow);
    }

    function changeReputation(address _user, int256 _change) external {
        require(msg.sender == postContractAddress, "Only post contract can change reputation");
        
        if (_change < 0 && uint256(-_change) > profiles[_user].reputation) {
            profiles[_user].reputation = 0;
        } else {
            profiles[_user].reputation = uint256(int256(profiles[_user].reputation) + _change);
        }

        emit ReputationChanged(_user, _change, profiles[_user].reputation);
    }

    function verifyProfile(address _user) external onlyOwner {
        require(profiles[_user].id != 0, "Profile does not exist");
        require(!profiles[_user].isVerified, "Profile already verified");

        profiles[_user].isVerified = true;
        profiles[_user].verificationTimestamp = block.timestamp;

        emit ProfileVerified(_user, block.timestamp);
    }

    function setAvatar(address _avatarContract, uint256 _avatarId) external {
        require(profiles[msg.sender].id != 0, "Profile does not exist");
        require(IERC721(_avatarContract).ownerOf(_avatarId) == msg.sender, "You don't own this NFT");

        profiles[msg.sender].avatarContract = _avatarContract;
        profiles[msg.sender].avatarId = _avatarId;

        emit AvatarSet(msg.sender, _avatarContract, _avatarId);
    }

    function mintAndSetAvatar(string memory _tokenURI) external {
        require(profiles[msg.sender].id != 0, "Profile does not exist");

        uint256 newAvatarId = avatarContract.mintAvatar(_tokenURI);
        profiles[msg.sender].avatarContract = address(avatarContract);
        profiles[msg.sender].avatarId = newAvatarId;

        emit AvatarSet(msg.sender, address(avatarContract), newAvatarId);
    }

    function addSkill(string memory _skill, uint256 _level) external {
        require(profiles[msg.sender].id != 0, "Profile does not exist");
        require(_level > 0 && _level <= 100, "Skill level must be between 1 and 100");

        profiles[msg.sender].skills.push(_skill);
        profiles[msg.sender].skillLevels[_skill] = _level;

        emit SkillAdded(msg.sender, _skill, _level);
    }

    function updateSkill(string memory _skill, uint256 _newLevel) external {
        require(profiles[msg.sender].id != 0, "Profile does not exist");
        require(_newLevel > 0 && _newLevel <= 100, "Skill level must be between 1 and 100");
        require(profiles[msg.sender].skillLevels[_skill] != 0, "Skill does not exist");

        profiles[msg.sender].skillLevels[_skill] = _newLevel;

        emit SkillUpdated(msg.sender, _skill, _newLevel);
    }

    // Read functions

    function getProfile(address _user) external view returns (
        uint256 id,
        string memory username,
        string memory bioHash,
        uint256 reputation,
        uint256[] memory posts,
        uint256[] memory comments,
        address[] memory followers,
        address[] memory following,
        bool isVerified,
        uint256 verificationTimestamp,
        address avatarContract,
        uint256 avatarId,
        string[] memory skills
    ) {
        Profile storage profile = profiles[_user];
        return (
            profile.id,
            profile.username,
            profile.bioHash,
            profile.reputation,
            profile.posts,
            profile.comments,
            profile.followers,
            profile.following,
            profile.isVerified,
            profile.verificationTimestamp,
            profile.avatarContract,
            profile.avatarId,
            profile.skills
        );
    }

    function getSkillLevel(address _user, string memory _skill) external view returns (uint256) {
        return profiles[_user].skillLevels[_skill];
    }

    function getFollowersCount(address _user) external view returns (uint256) {
        return profiles[_user].followers.length;
    }

    function getFollowingCount(address _user) external view returns (uint256) {
        return profiles[_user].following.length;
    }

    // Internal functions

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        require(from == address(0) || to == address(0), "Profile NFTs are non-transferable");
    }

    // Owner functions

    function setPostContractAddress(address _newAddress) external onlyOwner {
        postContractAddress = _newAddress;
    }

    // Emergency functions

    bool public paused = false;

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        IERC20(tokenAddress).transfer(owner(), tokenAmount);
    }
}