"use client";

import { useEffect, useState } from "react";
import Lottie from "lottie-react";

export default function LottieAnimation() {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch("/contact.json")
      .then((res) => res.json())
      .then((data) => setAnimationData(data));
  }, []);

  if (!animationData) return null;

  return (
    <Lottie className=""
      animationData={animationData}
      loop={true}
      style={{ width: 200, height: 200 }}
    />
  );
}
