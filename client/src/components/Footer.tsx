export function Footer() {
  return (
    <footer className="py-6 border-t bg-muted/30">
      <div className="container mx-auto px-4 text-center">
        <h3 className="font-bold text-lg text-foreground mb-1">Bomb Rolls & Bowls</h3>
        <p className="text-sm text-muted-foreground mb-4">Rolls, Bowls, and Everything in Between</p>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Bomb Rolls & Bowls. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
