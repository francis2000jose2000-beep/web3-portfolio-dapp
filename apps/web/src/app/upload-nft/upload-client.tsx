"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hardhat } from "viem/chains";
import { parseEther, type Address } from "viem";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { toast } from "sonner";
import { Mounted } from "@/components/Mounted";
import { Title } from "@/components/Title";
import { CONTRACT_ADDRESS, marketplaceAbi } from "@/config/contracts";
import { UploadPreviewPanel } from "@/app/upload-nft/upload-preview-panel";
import { UploadWizardPanel } from "@/app/upload-nft/upload-wizard-panel";
import { getErrorMessage, isUserRejectedError } from "@/lib/errors";
import { getApiBaseUrl } from "@/lib/api";

function isAddress(value: string): value is Address {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

type StepKey = 1 | 2 | 3;

type FlowPhase = "idle" | "uploading" | "confirming";
type ToastId = string | number;

type MediaType = "image" | "audio" | "video";

function detectMediaType(file: File): MediaType {
  const mime = typeof file.type === "string" ? file.type.toLowerCase() : "";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("image/")) return "image";

  const name = typeof file.name === "string" ? file.name.toLowerCase() : "";
  if (name.endsWith(".mp3") || name.endsWith(".wav")) return "audio";
  if (name.endsWith(".mp4") || name.endsWith(".mov")) return "video";
  return "image";
}

export function UploadNftClient() {
  const router = useRouter();
  const mountedFallback = (
    <div className="space-y-8">
      <div className="h-8 w-56 rounded bg-white/10" />
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="aspect-square rounded-3xl border border-white/10 bg-white/5" />
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6" />
      </div>
    </div>
  );

  const { isConnected } = useAccount();

  const chainIdRaw = process.env.NEXT_PUBLIC_CHAIN_ID ?? "";
  const chainId = chainIdRaw ? Number(chainIdRaw) : hardhat.id;
  const contractAddress = isAddress(CONTRACT_ADDRESS) ? (CONTRACT_ADDRESS as Address) : undefined;

  const [step, setStep] = useState<StepKey>(1);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string>("");
  const [mediaType, setMediaType] = useState<MediaType>("image");
  const [category, setCategory] = useState<string>("art");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [priceEth, setPriceEth] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);
  const [phase, setPhase] = useState<FlowPhase>("idle");
  const [submittedTxHash, setSubmittedTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [mintToastId, setMintToastId] = useState<ToastId | null>(null);

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    };
  }, [mediaPreviewUrl]);

  const { data: listingFeeData } = useReadContract({
    address: contractAddress,
    abi: marketplaceAbi,
    functionName: "getListingFee",
    chainId,
    query: {
      enabled: Boolean(contractAddress)
    }
  });

  const listingFeeWei = typeof listingFeeData === "bigint" ? listingFeeData : null;

  const { writeContractAsync, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: receiptError } = useWaitForTransactionReceipt({
    hash: submittedTxHash,
    chainId,
    query: {
      enabled: Boolean(submittedTxHash)
    }
  });

  const isBusy = phase !== "idle" || isPending || isConfirming;

  const phaseLabel = useMemo(() => {
    if (phase === "uploading") return "1/2 Uploading to IPFS...";
    if (phase === "confirming") return "2/2 Confirming on Blockchain...";
    return null;
  }, [phase]);

  const canSubmit = useMemo(() => {
    return (
      Boolean(contractAddress) &&
      isConnected &&
      listingFeeWei !== null &&
      mediaFile !== null &&
      mediaPreviewUrl.trim().length > 0 &&
      name.trim().length > 0 &&
      description.trim().length > 0 &&
      priceEth.trim().length > 0 &&
      !isBusy
    );
  }, [contractAddress, isConnected, listingFeeWei, mediaFile, mediaPreviewUrl, name, description, priceEth, isBusy]);

  useEffect(() => {
    if (phase === "confirming" && isSuccess) {
      if (mintToastId !== null) toast.success("NFT minted successfully.", { id: mintToastId });
      setMintToastId(null);
      setPhase("idle");
      router.push("/explore");
    }
  }, [phase, isSuccess, router, mintToastId]);

  useEffect(() => {
    if (phase !== "confirming") return;
    if (!receiptError) return;
    if (mintToastId !== null) toast.error(getErrorMessage(receiptError), { id: mintToastId });
    setMintToastId(null);
    setPhase("idle");
  }, [phase, receiptError, mintToastId]);

  const handleSelectFile = (file: File | null): void => {
    setFormError(null);

    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    if (!file) {
      setMediaFile(null);
      setMediaPreviewUrl("");
      return;
    }

    const nextType = detectMediaType(file);
    setMediaType(nextType);
    setCategory((prev) => {
      if (prev === "audio" || prev === "video" || prev === "art") {
        return nextType === "audio" ? "audio" : nextType === "video" ? "video" : "art";
      }
      return prev;
    });

    setMediaFile(file);
    setMediaPreviewUrl(URL.createObjectURL(file));
  };

  const handleMint = async (): Promise<void> => {
    setFormError(null);

    if (!isConnected) {
      setFormError("Connect your wallet to mint.");
      return;
    }

    if (!contractAddress) {
      setFormError("Invalid CONTRACT_ADDRESS in src/config/contracts.ts");
      return;
    }

    if (listingFeeWei === null) {
      setFormError("Listing fee not loaded yet.");
      return;
    }

    if (!mediaFile) {
      setFormError("Select a file first.");
      return;
    }

    let priceWei: bigint;
    try {
      priceWei = parseEther(priceEth);
    } catch {
      setFormError("Invalid price. Use a number like 0.05");
      return;
    }

    let toastId: ToastId | null = null;

    const assertApiReachable = async (): Promise<void> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      try {
        const base = getApiBaseUrl();
        const res = await fetch(`${base}/health`, {
          method: "GET",
          signal: controller.signal,
          headers: {
            Accept: "application/json"
          }
        });

        if (!res.ok) throw new Error(`API unreachable (${res.status})`);
      } catch {
        throw new Error("API is offline. Start the backend on port 3001 before uploading to IPFS.");
      } finally {
        clearTimeout(timeout);
      }
    };

    try {
      await assertApiReachable();
      toastId = toast.loading("Uploading to IPFS...");
      setMintToastId(toastId);
      setPhase("uploading");

      const uploadUrl = `${getApiBaseUrl()}/api/nfts/upload`;

      const formData = new FormData();
      formData.append("file", mediaFile);
      formData.append("name", name.trim());
      formData.append("description", description.trim());
      formData.append("category", category);

      const res = await fetch(uploadUrl, {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed (${res.status})`);
      }

      const json = (await res.json()) as unknown as { tokenURI?: string };
      const tokenURI = typeof json.tokenURI === "string" ? json.tokenURI : "";
      if (!tokenURI.trim()) {
        throw new Error("Upload succeeded but no tokenURI was returned.");
      }

      toast.loading("Please confirm in Wallet...", { id: toastId });
      setPhase("confirming");
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: marketplaceAbi,
        functionName: "createToken",
        args: [tokenURI.trim(), priceWei],
        value: listingFeeWei,
        chainId
      });

      toast.loading("2/2 Confirming on Blockchain...", { id: toastId });

      setSubmittedTxHash(hash);
    } catch (err: unknown) {
      setPhase("idle");
      const message = getErrorMessage(err);
      setFormError(message);
      if (toastId !== null) {
        if (isUserRejectedError(err)) toast.warning("Transaction Cancelled", { id: toastId });
        else toast.error(message, { id: toastId });
      }
      setMintToastId(null);
    }
  };

  return (
    <Mounted fallback={mountedFallback}>
      <div className="space-y-10">
        <Title
          eyebrow="Mint"
          title="Upload NFT"
          subtitle="A multi-step flow for minting and listing."
          right={
            <Link
              href="/explore"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10"
            >
              Explore
            </Link>
          }
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <UploadPreviewPanel
            mediaPreviewUrl={mediaPreviewUrl}
            mediaFileName={mediaFile?.name ?? null}
            mediaType={mediaType}
            listingFeeWei={listingFeeWei}
            isConnected={isConnected}
          />
          <UploadWizardPanel
            step={step}
            setStep={setStep}
            isBusy={isBusy}
            isConnected={isConnected}
            contractAddress={contractAddress}
            listingFeeWei={listingFeeWei}
            mediaPreviewUrl={mediaPreviewUrl}
            mediaFileName={mediaFile?.name ?? null}
            mediaType={mediaType}
            onSelectFile={handleSelectFile}
            category={category}
            setCategory={setCategory}
            name={name}
            setName={setName}
            description={description}
            setDescription={setDescription}
            priceEth={priceEth}
            setPriceEth={setPriceEth}
            formError={formError}
            setFormError={setFormError}
            canSubmit={canSubmit}
            onMint={() => void handleMint()}
            phaseLabel={phaseLabel}
            txHash={submittedTxHash}
            isConfirming={isConfirming}
            isSuccess={isSuccess}
            writeError={writeError}
            receiptError={receiptError}
            getErrorMessage={getErrorMessage}
          />
        </div>
      </div>
    </Mounted>
  );
}
