import { Suspense, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import WaterBg from "./WaterBg";
import FallingStickers3D from "./FallingStickers3D";
import { CameraRig, DotOverlay, GlassGltfModel, GlassSystemProvider } from "./GlassSystem";
import PostEffects from "./PostEffects";

type Ref = { current: number };

useGLTF.preload("/model/hello.gltf");
useGLTF.preload("/model/cursor.glb");

function HeroContents({
  scroll,
  dissolve,
  reduced,
}: {
  scroll: Ref;
  dissolve: Ref;
  reduced: boolean;
}) {
  const { size } = useThree();
  const isMobile = size.width < 768;

  const entryProgressRef = useRef(0);
  const afterProgressRef = useRef(0);
  const scrollOffsetYRef = useRef(0);

  useFrame((state, delta) => {
    entryProgressRef.current = Math.min(entryProgressRef.current + delta / 1.1, 1);
    const p = THREE.MathUtils.clamp(scroll.current, 0, 1);
    afterProgressRef.current = p;
    scrollOffsetYRef.current = p * state.viewport.height * 0.28;
  });

  return (
    <>
      <DotOverlay opacityRef={dissolve} overlayColors={["#0F1111", "#FBFAF4"]} overlayPixelSize={4} theme="dark" />
      <GlassSystemProvider theme="dark">
        <CameraRig
          scrollProgressRef={dissolve}
          parallaxEnabled={!reduced}
          parallaxStrength={1.4}
          parallaxLag={0.18}
          parallaxRotate={0.12}
          leaveParallaxLag={0.05}
          ready={true}
        />
        <WaterBg theme="dark" />
        <FallingStickers3D active={!reduced} zOffset={-6} />
        <GlassGltfModel
          url="/model/hello.gltf"
          modelPosition={[-0.1, 0, 2]}
          beforeRotation={[0, 240, 0]}
          rotation={[0, 4, 0]}
          afterRotation={[0, 90, 0]}
          scale={isMobile ? 19 : 22}
          floatingMotion={!reduced}
          tintEnabled={true}
          entryProgressRef={entryProgressRef}
          afterProgressRef={afterProgressRef}
          scrollOffsetYRef={scrollOffsetYRef}
        />
        <GlassGltfModel
          url="/model/cursor.glb"
          modelPosition={[isMobile ? 6.6 : 11.6, isMobile ? -5.6 : -4.2, -3]}
          rotationAxisTilt={[0, 0, 45]}
          beforeRotation={[0, 0, 0]}
          rotation={[0, 0, 0]}
          afterRotation={[0, 720, 0]}
          scale={0.1}
          floatingMotion={!reduced}
          tintEnabled={true}
          tingColor={["#009dff", "#009dff", "#64c3ff", "#64c3ff"]}
          entryProgressRef={entryProgressRef}
          afterProgressRef={afterProgressRef}
          scrollOffsetYRef={scrollOffsetYRef}
        />
        {!reduced && <PostEffects theme="dark" />}
      </GlassSystemProvider>
    </>
  );
}

export default function HeroScene({
  scroll,
  dissolve,
  active,
  reduced,
}: {
  scroll: Ref;
  dissolve: Ref;
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
        <HeroContents scroll={scroll} dissolve={dissolve} reduced={reduced} />
      </Suspense>
    </Canvas>
  );
}
