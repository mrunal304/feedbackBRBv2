export function Logo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <img 
      src="/images/logo.png" 
      alt="Bomb Rolls and Bowls Logo" 
      className={`${className} rounded-full object-cover`}
      data-testid="img-logo"
    />
  );
}
