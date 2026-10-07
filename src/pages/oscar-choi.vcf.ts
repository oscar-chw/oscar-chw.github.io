// "Save contact" on the card page: a vCard 3.0 built at build time from SITE, with a small photo.
// It carries no phone number (a content rule, checked by scan-content), only email and links.
import type { APIRoute } from "astro";
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { SITE } from "../data/site";

// vCard lines longer than 75 octets are folded: CRLF, then a single space
const fold = (line: string) => line.match(/.{1,74}/g)!.join("\r\n ");

export const GET: APIRoute = async () => {
  // read from the project root: at prerender, import.meta.url points into dist/
  const photo = await sharp(readFileSync("src/assets/profile_photo.jpg")).resize(240, 240, { fit: "cover" }).jpeg({ quality: 78 }).toBuffer();
  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Choi;Hei Wang;;;",
    "FN:Oscar Choi",
    "NICKNAME:Oscar",
    "ORG:The Chinese University of Hong Kong",
    "TITLE:Computer Science student",
    `EMAIL;TYPE=INTERNET:${SITE.email}`,
    `URL:${SITE.site}`,
    `X-SOCIALPROFILE;TYPE=linkedin:${SITE.linkedin}`,
    `X-SOCIALPROFILE;TYPE=github:${SITE.github}`,
    `X-SOCIALPROFILE;TYPE=discord;X-USER=${SITE.discord}:${SITE.discord}`,
    `NOTE:Quant developer · quant research · trading · software and AI engineering. Discord: ${SITE.discord}`,
    `PHOTO;ENCODING=b;TYPE=JPEG:${photo.toString("base64")}`,
    "END:VCARD",
  ];
  return new Response(lines.map(fold).join("\r\n") + "\r\n", { headers: { "content-type": "text/vcard; charset=utf-8" } });
};
