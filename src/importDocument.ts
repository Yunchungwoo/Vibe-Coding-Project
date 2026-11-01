import { manuscriptFromText } from "./studioModel";

export async function importDocument(file: File, folderId: string | null) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !["txt", "md", "markdown", "docx"].includes(extension))
    throw new Error("TXT, Markdown, DOCX 파일을 선택해주세요.");
  if (file.size > 5 * 1024 * 1024)
    throw new Error("5MB 이하의 파일을 선택해주세요.");
  const buffer = await file.arrayBuffer();
  let content: string;
  if (extension === "docx") {
    const mammoth = await import("mammoth/mammoth.browser");
    try {
      content = (await mammoth.extractRawText({ arrayBuffer: buffer })).value;
    } catch {
      throw new Error(
        "Word 문서를 읽을 수 없어요. 정상적인 DOCX 파일인지 확인해주세요.",
      );
    }
  } else {
    const bytes = new Uint8Array(buffer);
    if (bytes[0] === 0xff && bytes[1] === 0xfe)
      content = new TextDecoder("utf-16le").decode(buffer);
    else if (bytes[0] === 0xfe && bytes[1] === 0xff)
      content = new TextDecoder("utf-16be").decode(buffer);
    else {
      try {
        content = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        content = new TextDecoder("euc-kr").decode(buffer);
      }
    }
    if (content.includes("\0"))
      throw new Error(
        "텍스트 파일을 읽을 수 없어요. 파일 형식을 확인해주세요.",
      );
  }
  return manuscriptFromText(
    file.name.replace(/\.[^.]+$/, "") || "불러온 문서",
    content,
    folderId,
  );
}
