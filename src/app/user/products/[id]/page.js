'use client';
import ProductDetail from "@/components/user/products/product"; 

export default function ProductPage({ params }) {
  return <ProductDetail productId={params.id} />;
}