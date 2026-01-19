import { prepareInstructions } from "../../constants";
import { useState } from "react";
import type { JSX, FormEvent } from "react";
import { useNavigate } from "react-router";
import FileUploader from "~/components/FileUploader";
import Navbar from "~/components/Navbar";
import { convertPdfToImage } from "~/lib/pdf2img";
import { usePuterStore } from "~/lib/puter";
import { generateUUID } from "~/lib/utils";

const Upload = (): JSX.Element => {
  const { fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    try {
      setIsProcessing(true);
      setStatusText("Uploading resume...");

      const uploadedResume = await fs.upload([file]);
      if (!uploadedResume?.path) throw new Error("Resume upload failed");

      setStatusText("Converting PDF to image...");
      const imageResult = await convertPdfToImage(file);
      if (!imageResult.file) throw new Error("PDF conversion failed");

      setStatusText("Uploading image...");
      const uploadedImage = await fs.upload([imageResult.file]);
      if (!uploadedImage?.path) throw new Error("Image upload failed");

      setStatusText("Extracting text...");
      const extractedText = await ai.img2txt(imageResult.file);
      if (!extractedText) throw new Error("OCR failed");

      setStatusText("Analyzing resume...");
      const aiResponse = await ai.chat(
        [
          {
            role: "user",
            content: `
            Resume:
            ${extractedText}

            ${prepareInstructions({ jobTitle, jobDescription })}
            `,
          },
        ],
        undefined,
        false,
        { model: "gpt-3.5-turbo" }
      );

      const raw =
        typeof aiResponse?.message?.content === "string"
          ? aiResponse.message.content
          : aiResponse?.message?.content?.[0]?.text;

      if (!raw) throw new Error("AI returned empty response");

const sanitizeJSON = (input: string) => {
  // Remove code fences if AI sneaks them in
  let cleaned = input.trim();

  cleaned = cleaned.replace(/^```json/, "");
  cleaned = cleaned.replace(/^```/, "");
  cleaned = cleaned.replace(/```$/, "");

  return cleaned.trim();
};

let feedback;
try {
  feedback = JSON.parse(sanitizeJSON(raw));
} catch (err) {
  console.error("❌ RAW AI OUTPUT (INVALID JSON):\n", raw);
  throw new Error("AI returned invalid JSON. Try again.");
}

      const data = {
        id: generateUUID(),
        companyName,
        jobTitle,
        jobDescription,
        resumePath: uploadedResume.path,
        imagePath: uploadedImage.path,
        feedback,
      };

      await kv.set(`resume:${data.id}`, JSON.stringify(data));

      console.log("FINAL DATA:", data);
      setStatusText("Analysis complete");

    } catch (err: any) {
      console.error(err);
      setStatusText(err.message || "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) return;

    const form = e.currentTarget;
    const fd = new FormData(form);

    handleAnalyze({
      companyName: fd.get("company-name") as string,
      jobTitle: fd.get("job-title") as string,
      jobDescription: fd.get("job-description") as string,
      file,
    });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>

          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" />
            </>
          ) : (
            <>
              <h2>Drop your resume for ATS score & tips</h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                <input name="company-name" placeholder="Company Name" />
                <input name="job-title" placeholder="Job Title" />
                <textarea
                  name="job-description"
                  rows={5}
                  placeholder="Job Description"
                />
                <FileUploader onFileSelect={setFile} />
                <button className="primary-button" type="submit">
                  Analyze Resume
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;
