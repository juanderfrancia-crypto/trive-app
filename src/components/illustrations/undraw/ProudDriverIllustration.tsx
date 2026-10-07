import * as React from "react";
import { Image } from "react-native";
import type { SvgProps } from "react-native-svg";

const ASPECT_RATIO = 700 / 383;

const ProudDriverIllustration = ({ width = 200, height }: SvgProps) => {
  const w = typeof width === "number" ? width : 200;
  const h = typeof height === "number" ? height : undefined;
  return (
    <Image
      source={require("../../../../assets/proud-driver.png")}
      style={{ width: w, height: h, aspectRatio: h ? undefined : ASPECT_RATIO }}
      resizeMode="contain"
    />
  );
};
export default ProudDriverIllustration;
