import Svg, { Circle, Path, Rect } from 'react-native-svg';

type IconProps = { size?: number; color?: string };

export function CloseIcon({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 6L18 18M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function BackIcon({ size = 22, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 5L8 12L15 19" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 26, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12H19M13 6L19 12L13 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function CameraIcon({ size = 44, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.4-2h5.2L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z"
        stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill="none"
      />
      <Circle cx={12} cy={12.5} r={3.5} stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

export function GalleryIcon({ size = 44, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3.5} y={4.5} width={17} height={15} rx={2.5} stroke={color} strokeWidth={1.8} fill="none" />
      <Circle cx={9} cy={9.5} r={1.8} fill={color} />
      <Path d="M4 17l5-5 4 4 2.5-2.5L20 18" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

export function LocateIcon({ size = 18, color = '#fff' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={2} fill="none" />
      <Circle cx={12} cy={12} r={2} fill={color} />
      <Path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
