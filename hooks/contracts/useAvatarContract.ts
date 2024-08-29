import { createThirdwebClient, getContract, prepareContractCall, sendTransaction } from "thirdweb";
import { useReadContract, useActiveAccount } from "thirdweb/react";
import { baseSepolia } from "thirdweb/chains";
import { useCallback, useMemo, useEffect, useState } from "react";
import { useMutation, UseMutationResult, useQuery } from "@tanstack/react-query";
import { resolveContractAbi } from "thirdweb/contract";
import { Abi, AbiFunction } from "abitype";

const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '';
const AVATAR_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_AVATAR_CONTRACT_ADDRESS || '';

export const client = createThirdwebClient({ 
  clientId: THIRDWEB_CLIENT_ID 
});

enum AvatarTier {
  CUSTOM,
  COMMON,
  RARE,
  LEGENDARY
}

interface Avatar {
  tier: AvatarTier;
  mintTime: bigint;
}

interface ContractWriteParams {
  params: unknown[];
}

export function useAvatarContract() {
  const activeAccount = useActiveAccount();
  const [contractAbi, setContractAbi] = useState<Abi | null>(null);

  const contract = useMemo(() => getContract({ 
    client, 
    chain: baseSepolia, 
    address: AVATAR_CONTRACT_ADDRESS
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

  const useMintAvatar = useContractWrite("mintAvatar");
  const useMintTieredAvatar = useContractWrite("mintTieredAvatar");

  const useGetAvatarInfo = (tokenId: bigint) => {
    return useReadContract({
      contract,
      method: "getAvatarInfo",
      params: [tokenId],
    }) as { data: [AvatarTier, bigint] | undefined, isLoading: boolean, error: Error | null };
  };

  const useSupportsInterface = (interfaceId: string) => {
    return useReadContract({
      contract,
      method: "supportsInterface",
      params: [interfaceId],
    }) as { data: boolean | undefined, isLoading: boolean, error: Error | null };
  };

  const useOwnerOf = (tokenId: bigint) => {
    return useReadContract({
      contract,
      method: "ownerOf",
      params: [tokenId],
    }) as { data: string | undefined, isLoading: boolean, error: Error | null };
  };

  const useTokenURI = (tokenId: bigint) => {
    return useReadContract({
      contract,
      method: "tokenURI",
      params: [tokenId],
    }) as { data: string | undefined, isLoading: boolean, error: Error | null };
  };

  return {
    activeAccount,
    useMintAvatar,
    useMintTieredAvatar,
    useGetAvatarInfo,
    useSupportsInterface,
    useOwnerOf,
    useTokenURI,
  };
}