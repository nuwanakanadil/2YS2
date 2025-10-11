'use client'
import Calory from "@/components/user/CaloryDisplay/calory";

export default function Calorypage({ params }) {
    return <Calory food={params.food} />;
}