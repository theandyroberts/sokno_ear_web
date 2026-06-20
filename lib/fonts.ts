import { Rye, PT_Serif, Special_Elite } from "next/font/google";
import localFont from "next/font/local";

export const rye = Rye({
  weight: "400", subsets: ["latin"], display: "swap", variable: "--font-rye",
});
export const ptSerif = PT_Serif({
  weight: ["400", "700"], style: ["normal", "italic"], subsets: ["latin"],
  display: "swap", variable: "--font-pt-serif",
});
export const specialElite = Special_Elite({
  weight: "400", subsets: ["latin"], display: "swap", variable: "--font-special-elite",
});
export const blackthorn = localFont({
  src: "../public/fonts/Blackthorn.ttf",
  display: "swap", variable: "--font-blackthorn",
});

export const fontVars = [
  rye.variable, ptSerif.variable, specialElite.variable, blackthorn.variable,
].join(" ");
