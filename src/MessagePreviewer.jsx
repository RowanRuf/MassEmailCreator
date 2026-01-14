import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import "./MessagePreviewer.css";

export default function MessagePreviewer() {
  const [people, setPeople] = useState([]);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [images, setImages] = useState([]);

  const handleFileUpload = (item) => {
    const file = item.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target.result;
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet); //by default treats first row as headers
      setPeople(jsonData);
      setCurrentIndex(0);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImages((prev) => [...prev, event.target.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleNext = () => {
    if (currentIndex < people.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const copyToClipboard = async (html) => {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");

      doc.querySelectorAll("*").forEach(el => {
        el.style.removeProperty("color");
        el.style.removeProperty("background-color");
      });

      const cleanHtml = doc.body.innerHTML;
      const plainText = doc.body.innerText;

      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([cleanHtml], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        }),
      ]);
    } catch (err) {
      console.error("Failed to copy rich content:", err);
    }
  };

  const editableRef = useRef(null);
  const editableSubRef = useRef(null);

  const replacePlaceholders = (template, person) => {
    let result = template;

    // Replace [name] with the first column
    result = result.replace(/\[name\]/g, person.Name);

    // Replace [image]
    let imageIndex = 0;
    result = result.replace(/\[image\]/g, () => {      
      const img = images[imageIndex];
      imageIndex++;
      return img
        ? `<img src="${img}" alt="attachment" style="max-width:200px; display:block; margin-top:8px;" />`
        : "[missing image]";
    });

    Object.keys(person).forEach((key) => {
      const match = key.match(/^Custom(\d*)$/i); // matches Custom, Custom1, Custom2, etc.
      if (match) {
        result = result.replace(new RegExp(`\\[${key.toLowerCase()}\\]`, "g"), person[key]);
      }
    });
    return result;
  };

  const handleFormattingShortcuts = (e) => {
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      const commands = { b: "bold", i: "italic", u: "underline" };
      const cmd = commands[key];
      if (cmd) {
        e.preventDefault();
        document.execCommand(cmd, false, null);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();

    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    let content = html || text.replace(/\n/g, "<br>");

    const temp = document.createElement("div");
    temp.innerHTML = content;

    temp.querySelectorAll("*").forEach((el) => {
      if (el.tagName !== "IMG") {
        el.style.color = "white";
      }
    });

    document.execCommand("insertHTML", false, temp.innerHTML);
  };

  if (people.length === 0) {
    return (
      <div className="container">
        <h2>Mass Email Creator</h2>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <label>Upload Google Sheet/Excel File: </label>
            <a className="download-btn"   href={`${process.env.PUBLIC_URL}/email_template.xlsx`} download> Download Template </a>
          </div>
          <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
        </div>

        <div style={{ marginTop: 20 }}>
          <label>Upload Photos:</label>
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            multiple
            onChange={handleImageUpload}
          />
        </div>
        <div>
          <label>Subject Line</label>
          <div
            contentEditable
            className="subject-area"
            ref={editableSubRef}
            onInput={() => setSubjectLine(editableSubRef.current.innerHTML)}
            onKeyDown={handleFormattingShortcuts}
            onPaste={handlePaste}
            placeholder="Enter Subject Line"
          />
        </div>

        <div style={{ marginTop: 20 }}>
          <label>Message Template:</label>
          <div
            contentEditable
            className="editable-area"
            ref={editableRef}
            onInput={() => setMessageTemplate(editableRef.current.innerHTML)}
            onKeyDown={handleFormattingShortcuts}
            onPaste={handlePaste}
            placeholder="Hi [name],
            Here is an image: [image]
            Here are your custom messages:
            [custom1]
            [custom2]
            [custom3]"
          />
        </div>

        {images.length > 0 && (
          <div style={{ marginTop: 15 }}>
            <p>Preview of uploaded images:</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`uploaded-${i}`}
                  style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentPerson = people[currentIndex];
  const email = currentPerson.Email.replace(/[<>]/g, "");
  const modifiedMessage = replacePlaceholders(messageTemplate, currentPerson);

  return (
    <div className="container">
      <h2>Mass Email Creator</h2>

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label>Upload Google Sheet/Excel File: </label>
          <a className="download-btn"   href={`${process.env.PUBLIC_URL}/email_template.xlsx`} download> Download Template </a>
        </div>
        <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
      </div>

      <div style={{ marginTop: 20 }}>
        <label>Upload Photos:</label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          onChange={handleImageUpload}
        />
        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt={`uploaded-${i}`}
              style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8 }}
            />
          ))}
        </div>
      </div>
      <div>
        <label>Subject Line</label>
        <div
          contentEditable
          className="subject-area"
          ref={editableSubRef}
          onInput={() => setSubjectLine(editableSubRef.current.innerHTML)}
          onKeyDown={handleFormattingShortcuts}
          onPaste={handlePaste}
          placeholder="Enter Subject Line"
        />
      </div>
      <div style={{ marginTop: 20 }}>
        <label>Message Template:</label>
        <div
          contentEditable
          className="editable-area"
          ref={editableRef}
          onInput={() => setMessageTemplate(editableRef.current.innerHTML)}
          onKeyDown={handleFormattingShortcuts}
          onPaste={handlePaste}
          placeholder="Hi [name],
            Here is an image: [image]
            Here are your custom messages:
            [custom1]
            [custom2]
            [custom3]"
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <h3>
          Preview for {currentPerson.Name} ({email})
        </h3>

        <div
          className="preview-box"
          dangerouslySetInnerHTML={{ __html: modifiedMessage }}
        />

        <div style={{ marginTop: 10 }}>
          <button className="nav-btn" onClick={handlePrev} disabled={currentIndex === 0}>
            Previous
          </button>
          <button
            className="nav-btn"
            onClick={handleNext}
            disabled={currentIndex === people.length - 1}
          >
            Next
          </button>
          <button className="copy-btn" onClick={() => copyToClipboard(email)}>
            Copy Email
          </button>
          <button className="copy-btn" onClick={() => copyToClipboard(subjectLine)}>
            Copy Subject Line
          </button>
          <button className="copy-btn" onClick={() => copyToClipboard(modifiedMessage)}>
            Copy Message
          </button>
        </div>

        <p>
          {currentIndex + 1} of {people.length}
        </p>
      </div>
    </div>
  );
}