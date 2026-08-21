export function Logo({
  variant = "lockup",
  className,
}: {
  variant?: "lockup" | "logomark" | "logotype";
  className?: string;
}) {
  if (variant === "lockup") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 83 23" className={className}>
        <path
          fill="currentColor"
          d="M23 16.3h-6.7V23H23zM.1 6.7h16.19V0H6.8zM23 9.58 9.58 23H0L23 0zm46.31 9.27v-2.53l8.13-6.76h-8.1V6.98H82v2.56l-8.13 6.76h8.2v2.55zm-14.19 0v-2.53l8.13-6.76h-8.11V6.98h12.68v2.56l-8.14 6.76h8.2v2.55zm-9.36.21c-3.74 0-5.75-1.64-5.75-3.95 0-2.15 1.6-3.63 4.84-3.63h5.82v-.23c0-.96-.64-1.67-2.8-1.67h-6.35v-2.6h6.6c3.81 0 5.57 1.71 5.57 4.13v7.74h-3v-1.18c-.88.8-2.6 1.39-4.93 1.39m.48-2.49c3 0 4.43-1.1 4.43-2.38v-.38h-5.64c-1.2 0-1.96.45-1.96 1.28 0 .95.93 1.48 3.17 1.48m-19.66 2.28v-2.53l8.13-6.76h-8.1l2.57-2.58h10.1v2.56l-8.13 6.76h8.2v2.55z"
        />
      </svg>
    );
  }
  if (variant === "logomark") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 23 23" className={className}>
        <path
          fill="currentColor"
          d="M23 16.3h-6.7V23H23zM.1 6.7h16.19V0H6.8zM23 9.58 9.58 23H0L23 0z"
        />
      </svg>
    );
  }
  if (variant === "logotype") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 56 13" className={className}>
        <path
          fill="currentColor"
          d="M42.73 11.88V9.34l8.13-6.76h-8.1V0h12.67v2.56L47.3 9.32h8.2v2.56zm-14.19 0V9.34l8.13-6.76h-8.11V0h12.68v2.56L33.1 9.32h8.2v2.56zm-9.36.2c-3.74 0-5.75-1.64-5.75-3.95 0-2.15 1.6-3.63 4.84-3.63h5.83v-.23c0-.96-.64-1.67-2.81-1.67h-6.35V0h6.6c3.81 0 5.57 1.71 5.57 4.13v7.75h-3v-1.2c-.88.8-2.6 1.4-4.93 1.4m.48-2.49c3 0 4.44-1.1 4.44-2.37v-.4h-5.65c-1.2 0-1.96.47-1.96 1.29 0 .96.94 1.48 3.17 1.48M0 11.88V9.34l8.13-6.76H.03L2.6 0h10.1v2.56L4.57 9.32h8.2v2.56z"
        />
      </svg>
    );
  }
}
