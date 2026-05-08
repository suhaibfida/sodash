import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const WalletButton = () => {
  return (
    <WalletMultiButton className="sketch-wallet-button !h-auto !rounded-none !bg-transparent !px-6 !py-3.5 !font-semibold !text-white !shadow-none !text-base" />
  );
};

export default WalletButton;
