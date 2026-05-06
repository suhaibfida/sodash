import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

const WalletButton = () => {
  return (
    <WalletMultiButton className="sketch-wallet-button !h-auto !rounded-none !bg-transparent !px-5 !py-3 !font-semibold !text-white !shadow-none" />
  );
};

export default WalletButton;
