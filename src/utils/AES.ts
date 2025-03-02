import crypto from "crypto";
const IV_SIZE = 16;
export class AES
{
    static Encrypt(plainText:string, keyString:string)
    {
        //@ts-ignore
        const iv = crypto.randomBytes(IV_SIZE);
        //@ts-ignore
        const cipher = crypto.createCipheriv("aes-256-cbc", keyString, iv);
        //@ts-ignore
        let cipherText = cipher.update(Buffer.from(plainText, "utf8"));
        //@ts-ignore
        cipherText = Buffer.concat([cipherText, cipher.final()]);
        //@ts-ignore
        const combinedData = Buffer.concat([iv, cipherText]);
        const combinedString = combinedData.toString("base64");
        return encodeURIComponent(combinedString);
    }

    static Decrypt(combinedString:string, keyString:string)
    {
        //@ts-ignore
        const combinedData = Buffer.from(decodeURIComponent(combinedString), "base64");
        //@ts-ignore
        const iv = Buffer.alloc(IV_SIZE);
        //@ts-ignore
        const cipherText = Buffer.alloc(combinedData.length - iv.length);
        //@ts-ignore
        combinedData.copy(iv, 0, 0, iv.length);
        //@ts-ignore
        combinedData.copy(cipherText, 0, iv.length);
        //@ts-ignore
        const decipher = crypto.createDecipheriv("aes-256-cbc", keyString, iv);
        //@ts-ignore
        let plainText = decipher.update(cipherText);
        //@ts-ignore
        plainText = Buffer.concat([plainText, decipher.final()]);
        return plainText.toString("utf8");
    }
}