import crypto from 'crypto'

// extract variables from .js file
export const extractVariables = (text: string, sourceName: string) => {
  let allvars;
  if (sourceName !== "MEGACLOUD") {
    allvars =
      text
        .match(
          /const (?:\w{1,2}=(?:'.{0,50}?'|\w{1,2}\(.{0,20}?\)).{0,20}?,){7}.+?;/gm
        )
        ?.at(-1) ?? "";
  } else {
    allvars =
      text.match(/\w{1,2}=new URLSearchParams.+?;(?=function)/gm)?.at(1) ?? "";
  }
  const vars = allvars
    .slice(0, -1)
    .split("=")
    .slice(1)
    .map((pair) => Number(pair.split(",").at(0)))
    .filter((num) => num === 0 || num);

  return vars;
};

// get secret key from extracted variables
export const getSecret = (encryptedString: string, values: number[]) => {
  let secret = "",
    encryptedSource = encryptedString,
    totalInc = 0;

  for (let i = 0; i < values[0]!; i++) {
    let start, inc;
    switch (i) {
      case 0:
        (start = values[2]), (inc = values[1]);
        break;
      case 1:
        (start = values[4]), (inc = values[3]);
        break;
      case 2:
        (start = values[6]), (inc = values[5]);
        break;
      case 3:
        (start = values[8]), (inc = values[7]);
        break;
      case 4:
        (start = values[10]), (inc = values[9]);
        break;
      case 5:
        (start = values[12]), (inc = values[11]);
        break;
      case 6:
        (start = values[14]), (inc = values[13]);
        break;
      case 7:
        (start = values[16]), (inc = values[15]);
        break;
      case 8:
        (start = values[18]), (inc = values[17]);
    }
    const from = start! + totalInc,
      to = from + inc!;
    (secret += encryptedString.slice(from, to)),
      (encryptedSource = encryptedSource.replace(
        encryptedString.substring(from, to),
        ""
      )),
      (totalInc += inc!);
  }

  return { secret, encryptedSource };
};

// decrypt the encrypted string using secret
export const decrypt = (
  encrypted: string,
  keyOrSecret: string,
  maybe_iv?: string
) => {
  let key;
  let iv;
  let contents;
  if (maybe_iv) {
    key = keyOrSecret;
    iv = maybe_iv;
    contents = encrypted;
  } else {
    const cypher = Buffer.from(encrypted, "base64");
    const salt = cypher.subarray(8, 16);
    //@ts-ignore
    const password = Buffer.concat([Buffer.from(keyOrSecret, "binary"), salt]);
    const md5Hashes = [];
    let digest = password;
    for (let i = 0; i < 3; i++) {
    //@ts-ignore
      md5Hashes[i] = crypto.createHash("md5").update(digest).digest();
    //@ts-ignore
      digest = Buffer.concat([md5Hashes[i], password]);
    }
    //@ts-ignore
    key = Buffer.concat([md5Hashes[0], md5Hashes[1]]);
    iv = md5Hashes[2];
    contents = cypher.subarray(16);
  }
    //@ts-ignore

  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted =
    decipher.update(
      contents as any,
      typeof contents === "string" ? "base64" : undefined,
      "utf8"
    ) + decipher.final();

  return decrypted;
};