import { ProductCatalogAdmin } from "../../components/catalog-admin";

export default async function Page({ params }: { params: Promise<{ id: string }> }) { return <ProductCatalogAdmin kind="media" productId={(await params).id} />; }
