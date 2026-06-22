export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <main className="flex h-full min-h-0 flex-1 flex-col">{children}</main>;
}
