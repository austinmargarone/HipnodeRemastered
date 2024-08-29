import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { useReadContract, useActiveAccount } from "thirdweb/react";
import { baseSepolia } from "thirdweb/chains";
import { useCallback, useMemo, useEffect, useState } from "react";
import { useMutation, UseMutationResult, useQuery } from "@tanstack/react-query";
import { resolveContractAbi } from "thirdweb/contract";
import { Abi, AbiFunction } from "abitype";

const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '';
const PROFILE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PROFILE_CONTRACT_ADDRESS || '';

export const client = createThirdwebClient({ 
  clientId: THIRDWEB_CLIENT_ID 
});

interface Profile {
  id: bigint;
  username: string;
  bioHash: string;
  reputation: bigint;
  posts: bigint[];
  comments: bigint[];
  followers: string[];
  following: string[];
  isVerified: boolean;
  verificationTimestamp: bigint;
  avatarContract: string;
  avatarId: bigint;
  skills: string[];
}

interface ContractWriteParams {
  params: unknown[];
}

export function useProfileContract() {
  const activeAccount = useActiveAccount();
  const [contractAbi, setContractAbi] = useState<Abi | null>(null);

  const contract = useMemo(() => getContract({ 
    client, 
    chain: baseSepolia, 
    address: PROFILE_CONTRACT_ADDRESS
  }), []);

  useEffect(() => {
    resolveContractAbi(contract).then(setContractAbi);
  }, [contract]);

  const useContractWrite = useCallback((methodName: string): UseMutationResult<string, Error, ContractWriteParams> => {
    return useMutation({
      mutationFn: async ({ params }: ContractWriteParams) => {
        if (!contractAbi || !activeAccount) {
          throw new Error("Contract ABI or active account not available");
        }
        const method = contractAbi.find(item => item.type === "function" && item.name === methodName) as AbiFunction;
        if (!method) {
          throw new Error(`Method ${methodName} not found in ABI`);
        }
        const transaction = await prepareContractCall({
          contract,
          method,
          params
        });
        const { transactionHash } = await sendTransaction({
          transaction,
          account: activeAccount
        });
        return transactionHash;
      }
    });
  }, [contract, contractAbi, activeAccount]);

  const useCreateProfile = useContractWrite("createProfile");
  const useUpdateProfile = useContractWrite("updateProfile");
  const useFollowUser = useContractWrite("followUser");
  const useUnfollowUser = useContractWrite("unfollowUser");
  const useSetAvatar = useContractWrite("setAvatar");
  const useMintAndSetAvatar = useContractWrite("mintAndSetAvatar");
  const useAddSkill = useContractWrite("addSkill");
  const useUpdateSkill = useContractWrite("updateSkill");

  const useGetProfile = (address: string) => {
    return useReadContract({
      contract,
      method: "getProfile",
      params: [address],
    }) as { data: Profile | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetSkillLevel = (address: string, skill: string) => {
    return useReadContract({
      contract,
      method: "getSkillLevel",
      params: [address, skill],
    }) as { data: bigint | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetFollowersCount = (address: string) => {
    return useReadContract({
      contract,
      method: "getFollowersCount",
      params: [address],
    }) as { data: bigint | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetFollowingCount = (address: string) => {
    return useReadContract({
      contract,
      method: "getFollowingCount",
      params: [address],
    }) as { data: bigint | undefined, isLoading: boolean, error: Error | null };
  };

  const useIsFollowing = (follower: string, followed: string) => {
    return useReadContract({
      contract,
      method: "isFollowing",
      params: [follower, followed],
    }) as { data: boolean | undefined, isLoading: boolean, error: Error | null };
  };

  return {
    activeAccount,
    useCreateProfile,
    useUpdateProfile,
    useFollowUser,
    useUnfollowUser,
    useSetAvatar,
    useMintAndSetAvatar,
    useAddSkill,
    useUpdateSkill,
    useGetProfile,
    useGetSkillLevel,
    useGetFollowersCount,
    useGetFollowingCount,
    useIsFollowing,
  };
}