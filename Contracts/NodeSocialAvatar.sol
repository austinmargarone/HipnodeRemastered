// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract NodeSocialAvatar is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    enum AvatarTier { CUSTOM, COMMON, RARE, LEGENDARY }

    struct Avatar {
        AvatarTier tier;
        uint256 mintTime;
    }

    mapping(uint256 => Avatar) public avatars;

    event AvatarMinted(address indexed owner, uint256 indexed tokenId, AvatarTier tier);

    constructor(address initialOwner) ERC721("NodeSocialAvatar", "NSA") Ownable(initialOwner) {}

    function mintAvatar(string memory tokenURI) external returns (uint256) {
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(msg.sender, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        avatars[newTokenId] = Avatar(AvatarTier.CUSTOM, block.timestamp);

        emit AvatarMinted(msg.sender, newTokenId, AvatarTier.CUSTOM);

        return newTokenId;
    }

    function mintTieredAvatar(address to, AvatarTier tier, string memory tokenURI) external onlyOwner returns (uint256) {
        require(tier != AvatarTier.CUSTOM, "Cannot mint CUSTOM tier through this function");

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        avatars[newTokenId] = Avatar(tier, block.timestamp);

        emit AvatarMinted(to, newTokenId, tier);

        return newTokenId;
    }

    function getAvatarInfo(uint256 tokenId) external view returns (AvatarTier, uint256) {
        require(_exists(tokenId), "Avatar does not exist");
        Avatar memory avatar = avatars[tokenId];
        return (avatar.tier, avatar.mintTime);
    }
}