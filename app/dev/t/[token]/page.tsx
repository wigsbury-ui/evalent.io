// app/dev/t/[token]/page.tsx
// Wrapper so /dev/t/[token] mirrors /t/[token]
export { default } from "../../../t/[token]/page";
export const dynamic = "force-dynamic";
