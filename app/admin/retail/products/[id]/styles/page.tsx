import { ProductCatalogAdmin } from "../../components/catalog-admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ProductCatalogAdmin kind="styles" productId={(await params).id} />; }
