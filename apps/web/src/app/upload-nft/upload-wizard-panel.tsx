"use client";

import { useMemo } from "react";

type StepKey = 1 | 2 | 3;

type UploadWizardPanelProps = {
  step: StepKey;
  setStep: (next: StepKey) => void;
  isBusy: boolean;
  isConnected: boolean;
  contractAddress: string | undefined;
  listingFeeWei: bigint | null;
  mediaPreviewUrl: string;
  mediaFileName: string | null;
  mediaType: "image" | "audio" | "video";
  onSelectFile: (file: File | null) => void;
  category: string;
  setCategory: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  priceEth: string;
  setPriceEth: (v: string) => void;
  formError: string | null;
  setFormError: (v: string | null) => void;
  canSubmit: boolean;
  onMint: () => void;
  phaseLabel: string | null;
  txHash?: `0x${string}`;
  isConfirming: boolean;
  isSuccess: boolean;
  writeError?: Error | null;
  receiptError?: Error | null;
  getErrorMessage: (err: unknown) => string;
};

export function UploadWizardPanel(props: UploadWizardPanelProps) {
  const {
    step,
    setStep,
    isBusy,
    contractAddress,
    listingFeeWei,
    mediaPreviewUrl,
    mediaFileName,
    mediaType,
    onSelectFile,
    category,
    setCategory,
    name,
    setName,
    description,
    setDescription,
    priceEth,
    setPriceEth,
    formError,
    setFormError,
    canSubmit,
    onMint,
    phaseLabel,
    txHash,
    isConfirming,
    isSuccess,
    writeError,
    receiptError,
    getErrorMessage
  } = props;

  const stepOk = useMemo(() => {
    if (step === 1) return Boolean(mediaFileName) && mediaPreviewUrl.trim().length > 0;
    if (step === 2) return name.trim().length > 0 && description.trim().length > 0;
    if (step === 3) return priceEth.trim().length > 0;
    return false;
  }, [step, mediaFileName, mediaPreviewUrl, name, description, priceEth]);

  const progress = useMemo(() => {
    return [1, 2, 3].map((n) => ({ step: n as StepKey, active: n === step, done: n < step }));
  }, [step]);

  const handleNext = (): void => {
    setFormError(null);
    if (!stepOk) {
      setFormError("Complete this step first.");
      return;
    }
    setStep(step < 3 ? ((step + 1) as StepKey) : step);
  };

  const handleBack = (): void => {
    setFormError(null);
    setStep(step > 1 ? ((step - 1) as StepKey) : step);
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-zinc-100">Steps</div>
        <div className="flex items-center gap-2">
          {progress.map((p) => (
            <div
              key={p.step}
              className={
                p.done
                  ? "h-2 w-10 rounded-full bg-web3-cyan/60"
                  : p.active
                    ? "h-2 w-10 rounded-full bg-web3-purple/70"
                    : "h-2 w-10 rounded-full bg-white/10"
              }
            />
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-5">
        {step === 1 ? (
          <div>
            <label className="text-sm font-semibold text-zinc-100">Media</label>
            <div className="mt-2 rounded-2xl border border-dashed border-white/15 bg-zinc-950/30 px-5 py-6">
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <div className="text-sm font-semibold text-zinc-100">Drop a file here</div>
                <div className="text-xs text-zinc-400">Images, audio, or video (up to 50MB)</div>
                <div className="mt-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200">
                  Detected: {mediaType.toUpperCase()}
                </div>
                <label className="mt-3 inline-flex cursor-pointer items-center justify-center rounded-xl bg-web3-purple px-4 py-2 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110">
                  Choose file
                  <input
                    type="file"
                    accept="image/*,audio/*,video/*,.mov"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      onSelectFile(f);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                {mediaFileName ? <div className="mt-2 text-xs text-zinc-300">Selected: {mediaFileName}</div> : null}
              </div>
              <div
                className="mt-4 rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-xs text-zinc-400"
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0] ?? null;
                  onSelectFile(f);
                }}
              >
                Tip: You can drag & drop into this box.
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-400">We upload the media + metadata to IPFS and store the metadata tokenURI on-chain.</p>
          </div>
        ) : null}

        {step === 2 ? (
          <>
            <div>
              <label className="text-sm font-semibold text-zinc-100">Category</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: "Art", value: "art" },
                  { label: "Audio", value: "audio" },
                  { label: "Video", value: "video" }
                ].map((opt) => {
                  const active = category === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setCategory(opt.value)}
                      className={
                        active
                          ? "rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-zinc-50 shadow-glow"
                          : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:bg-white/10 hover:text-zinc-50"
                      }
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-zinc-100">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-web3-purple/60 focus:shadow-glow"
                placeholder="Neon Artifact #1"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-zinc-100">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-2 min-h-[110px] w-full resize-none rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-white/20 focus:shadow-glow"
                placeholder="Short description of your NFT."
              />
            </div>
          </>
        ) : null}

        {step === 3 ? (
          <div>
            <label className="text-sm font-semibold text-zinc-100">Price (ETH)</label>
            <input
              value={priceEth}
              onChange={(e) => setPriceEth(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-50 outline-none transition placeholder:text-zinc-500 focus:border-web3-cyan/60 focus:shadow-glow"
              placeholder="0.05"
              inputMode="decimal"
              autoComplete="off"
            />

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onMint}
                disabled={!canSubmit}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-web3-cyan px-5 py-3 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {phaseLabel ? phaseLabel : isBusy ? "Working..." : isSuccess ? "Minted" : "Create"}
              </button>
              <div className="rounded-2xl border border-white/10 bg-zinc-950/30 px-4 py-3">
                <div className="text-xs text-zinc-500">Contract</div>
                <div className="mt-1 truncate font-mono text-xs font-semibold text-zinc-200">{contractAddress ?? "N/A"}</div>
              </div>
            </div>
            {phaseLabel ? <div className="mt-3 text-xs font-semibold text-zinc-200">{phaseLabel}</div> : null}
          </div>
        ) : null}

        {listingFeeWei === null ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4 text-sm text-zinc-200">Loading listing fee...</div>
        ) : null}

        {formError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{formError}</div>
        ) : null}

        {writeError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {getErrorMessage(writeError)}
          </div>
        ) : null}

        {receiptError ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {getErrorMessage(receiptError)}
          </div>
        ) : null}

        {txHash ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950/30 p-4">
            <div className="text-xs text-zinc-500">Transaction</div>
            <div className="mt-1 break-all font-mono text-xs font-semibold text-zinc-100">{txHash}</div>
            <div className="mt-1 text-xs text-zinc-400">{isConfirming ? "Confirming..." : isSuccess ? "Confirmed" : "Submitted"}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1 || isBusy}
          className="rounded-xl border border-white/10 bg-zinc-950/30 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Back
        </button>
        {step < 3 ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!stepOk || isBusy}
            className="rounded-xl bg-web3-purple px-4 py-2 text-sm font-semibold text-zinc-950 shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Next
          </button>
        ) : null}
      </div>
    </section>
  );
}
