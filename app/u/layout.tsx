import { PageBar } from "@/components/shell/PageBar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageBar />
      {children}
    </>
  );
}
