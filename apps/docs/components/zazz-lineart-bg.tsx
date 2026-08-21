import type { SVGProps } from "react";

export default function ZazzLineartBg({
  className,
  ...props
}: { className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 1244 700"
      className={className}
      {...props}
    >
      <path
        fill="currentColor"
        fillOpacity=".01"
        d="M736.5 478.88H556.53v180.36H736.5zM119.56 221.32h436.97V40.97H301.97z"
      />
      <path
        fill="currentColor"
        fillOpacity=".01"
        d="M736.5 298.54 556.53 478.9 376.57 659.24H119.56L736.5 40.97z"
      />
      <path
        stroke="currentColor"
        strokeOpacity=".05"
        d="M736.5 478.88H556.53v180.36M736.5 478.88v180.36m0-180.36h134m-134 0V430M556.53 659.24H736.5m-179.97 0v28.39m0-28.4H-115.5m852 0H1331m-594.5 0V776M119.56 221.32h436.97V40.97M119.56 221.32l182.4-180.35m-182.4 180.35H-166m285.56 0L-52.62 393.5M556.53 40.97H301.97m254.56 0H1339m-782.47 0V-103M301.97 40.97l116.5-116.59M301.97 40.97H-166m902.5 257.57V40.97m0 257.57L556.53 478.9 376.57 659.24m359.93-360.7L1096.04-61M736.5 298.54v24.96M376.57 659.24H119.56m257.01 0L249.9 786M119.56 659.24 736.5 40.97M119.56 659.24 8.03 770.84m111.53-111.6V-29.5m0 688.74V776M736.5 40.97 853-75.62M736.5 40.97V-75.62"
      />
    </svg>
  );
}
