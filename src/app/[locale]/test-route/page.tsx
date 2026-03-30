export default function TestPage() {
  return <h1>Test Route Works!</h1>;
}
export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "ar" }];
}
