import { createThirdwebClient, getContract, prepareContractCall } from "thirdweb";
import { useReadContract, useActiveAccount, useSendTransaction } from "thirdweb/react";
import { baseSepolia } from "thirdweb/chains";
import { useCallback, useMemo, useEffect, useState } from "react";
import { useMutation, UseMutationResult } from "@tanstack/react-query";
import { resolveContractAbi } from "thirdweb/contract";
import { Abi, AbiFunction } from "abitype";

const THIRDWEB_CLIENT_ID = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '';
const POST_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_POST_CONTRACT_ADDRESS || '';

export const client = createThirdwebClient({ 
  clientId: THIRDWEB_CLIENT_ID 
});

interface Post {
  id: bigint;
  author: string;
  contentHash: string;
  timestamp: bigint;
  likes: bigint;
  tips: bigint;
  isPremium: boolean;
  premiumPrice: bigint;
  tags: string[];
  isDeleted: boolean;
  unlockTime: bigint;
}

interface ContractWriteParams {
  params: unknown[];
}

export function usePostContract() {
  const activeAccount = useActiveAccount();
  const [contractAbi, setContractAbi] = useState<Abi | null>(null);

  const contract = useMemo(() => getContract({ 
    client, 
    chain: baseSepolia, 
    address: POST_CONTRACT_ADDRESS
  }), []);

  useEffect(() => {
    resolveContractAbi(contract).then(setContractAbi).catch(error => {
      console.error("Failed to resolve contract ABI:", error);
    });
  }, [contract]);

  const { mutate: sendTx, data: transactionResult } = useSendTransaction();

  const useContractWrite = useCallback((methodName: string): UseMutationResult<void, Error, ContractWriteParams> => {
    return useMutation({
      mutationFn: async ({ params }: ContractWriteParams) => {
        if (!contractAbi) {
          throw new Error("Contract ABI not available");
        }
        if (!activeAccount) {
          throw new Error("Active account not available");
        }
        const method = contractAbi.find(item => item.type === "function" && item.name === methodName) as AbiFunction;
        if (!method) {
          throw new Error(`Method ${methodName} not found in ABI`);
        }
        try {
          const preparedTransaction = await prepareContractCall({
            contract,
            method,
            params
          });
          await sendTx(preparedTransaction);
        } catch (error) {
          console.error("Error in contract write:", error);
          throw error;
        }
      }
    });
  }, [contract, contractAbi, activeAccount, sendTx]);

  const useCreatePost = useContractWrite("createPost");
  const useLikePost = useContractWrite("likePost");
  const useCommentOnPost = useContractWrite("createComment");
  const useTipPost = useContractWrite("tipPost");
  const useUpdatePost = useContractWrite("updatePostContent");

  const useGetPost = (postId: bigint) => {
    return useReadContract({
      contract,
      method: "getPost",
      params: [postId],
    }) as { data: Post | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetTrendingPosts = () => {
    return useReadContract({
      contract,
      method: "getTrendingPosts",
      params: [], // Add empty params array
    }) as { data: bigint[] | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetTaggedPosts = (tag: string) => {
    return useReadContract({
      contract,
      method: "getTaggedPosts",
      params: [tag],
    }) as { data: bigint[] | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetPostsByAuthor = (author: string) => {
    return useReadContract({
      contract,
      method: "getPostsByAuthor",
      params: [author],
    }) as { data: bigint[] | undefined, isLoading: boolean, error: Error | null };
  };

  const useCanAccessPremiumContent = (postId: bigint, user: string) => {
    return useReadContract({
      contract,
      method: "canAccessPremiumContent",
      params: [postId, user],
    }) as { data: boolean | undefined, isLoading: boolean, error: Error | null };
  };

  const usePurchasePremiumAccess = useContractWrite("purchasePremiumAccess");

  const useGetTotalPosts = () => {
    return useReadContract({
      contract,
      method: "getTotalPosts",
      params: [], // Add empty params array
    }) as { data: bigint | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetTotalComments = () => {
    return useReadContract({
      contract,
      method: "getTotalComments",
      params: [], // Add empty params array
    }) as { data: bigint | undefined, isLoading: boolean, error: Error | null };
  };

  const useIsPostLikedByUser = (postId: bigint, user: string) => {
    return useReadContract({
      contract,
      method: "isPostLikedByUser",
      params: [postId, user],
    }) as { data: boolean | undefined, isLoading: boolean, error: Error | null };
  };

  const useGetPostComments = (postId: bigint) => {
    return useReadContract({
      contract,
      method: "getPostComments",
      params: [postId],
    }) as { data: bigint[] | undefined, isLoading: boolean, error: Error | null };
  };

  return {
    activeAccount,
    useCreatePost,
    useUpdatePost,
    useLikePost,
    useCommentOnPost,
    useTipPost,
    useGetPost,
    useGetTrendingPosts,
    useGetTaggedPosts,
    useGetPostsByAuthor,
    useCanAccessPremiumContent,
    usePurchasePremiumAccess,
    useGetTotalPosts,
    useGetTotalComments,
    useIsPostLikedByUser,
    useGetPostComments,
  };
}