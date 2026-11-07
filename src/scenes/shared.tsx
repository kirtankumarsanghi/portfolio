import * as THREE from "three";
import { Environment, Lightformer } from "@react-three/drei";
import { attachJelly } from "./jelly";

/**
 * Soft white softboxes on a deep-navy room → long white specular streaks along the gel,
 * navy in the shadows. Generated locally (no HDRI download). No coloured rim lights.
 */
export function GelEnv() {
  return (
    <Environment resolution={512} frames={1}>
      <color attach="background" args={["#030833"]} />
      <Lightformer form="rect" intensity={14} color="#ffffff" position={[0, 6, 3]} scale={[16, 5, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={6} color="#ffffff" position={[-8, 1.5, 4]} scale={[9, 2.6, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={6} color="#ffffff" position={[8, 0, 3]} scale={[9, 2.2, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={2.6} color="#e6ebff" position={[0, -2, 9]} scale={[14, 1.6, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={1.0} color="#2f49ff" position={[0, -6, 2]} scale={[16, 4, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

/** Inflated gel / balloon material shared by the hero word and the closing knot. */
export function makeGelMaterial(): THREE.MeshPhysicalMaterial {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#252cb8"),
    metalness: 0.05,
    roughness: 0.16,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transmission: 0, // solid + opaque: never see-through or glassy
    sheen: 0.1,
    sheenColor: new THREE.Color("#7d93ff"),
    sheenRoughness: 0.65,
    envMapIntensity: 0.95,
    iridescence: 0.06, // base rainbow sheen in the speculars; boosted while the jelly wobbles
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [140, 420],
  });
  attachJelly(mat);
  return mat;
}
