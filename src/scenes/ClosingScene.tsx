import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import WaterBg from "./WaterBg";
import { CameraRig, DotOverlay, GlassGltfModel, GlassSystemProvider } from "./GlassSystem";
import PostEffects from "./PostEffects";

useGLTF.preload("/model/cnt.gltf");

function ClosingContents({
  resolve,
  reduced,
}: {
  resolve: { current: number };
  reduced: boolean;
}) {
  const { size } = useThree();
  const isMobile = size.width < 768;

  const entryProgressRef = useRef(1);
  const afterProgressRef = useRef(0);

  useFrame(() => {
    // resolve runs 1 -> 0 as section enters viewport; entry runs 0 -> 1
    const r = THREE.MathUtils.clamp(resolve.current, 0, 1);
    entryProgressRef.current = 1 - r;
  });

  return (
    <>
      <DotOverlay opacityRef={resolve} overlayColors={["#0F1111", "#FBFAF4"]} overlayPixelSize={4} theme="dark" />
      <GlassSystemProvider theme="dark">
        <CameraRig
          scrollProgressRef={resolve}
          parallaxEnabled={!reduced}
          parallaxStrength={1.4}
          parallaxLag={0.18}
          parallaxRotate={0.12}
          leaveParallaxLag={0.05}
          ready={true}
        />
        <WaterBg theme="dark" />
        <GlassGltfModel
          url="/model/cnt.gltf"
          modelPosition={[0, 0, 0]}
          beforeRotation={[-180, 0, 0]}
          rotation={[0, 0, 0]}
          scale={isMobile ? 14 : 19}
          floatingMotion={!reduced}
          tintEnabled={true}
          tingColor={["#FFFFFF", "#009dff", "#8e9dc4", "#64c3ff"]}
          entryProgressRef={entryProgressRef}
          afterProgressRef={afterProgressRef}
        />
        {!reduced && <PostEffects theme="dark" />}
      </GlassSystemProvider>
    </>
  );
}

export default function ClosingScene({
  resolve,
  active,
  reduced,
}: {
  resolve: { current: number };
  active: boolean;
  reduced: boolean;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 24], fov: 35, near: 0.1, far: 100 }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <ClosingContents resolve={resolve} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
