import { useCallback, useRef, useState } from 'react';
import type { UploadedFile, AnalysisResult } from '../../types';
import { UnifiedAnalyzer } from '../../parsers/analyzer';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  pcbFile: UploadedFile | null;
  schematicFiles: UploadedFile[];
  onPcbFileChange: (file: UploadedFile | null) => void;
  onSchematicFilesChange: (files: UploadedFile[]) => void;
  onFilesParsed: (result: AnalysisResult) => void;
}

export function FileUpload({
  pcbFile,
  schematicFiles,
  onPcbFileChange,
  onSchematicFilesChange,
  onFilesParsed,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFileContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  const processFiles = useCallback(async (
    pcb: UploadedFile | null,
    schematics: UploadedFile[]
  ) => {
    if (!pcb || !pcb.content) return;

    setParseError(null);

    try {
      const analyzer = new UnifiedAnalyzer();
      const schematicFileContents = schematics
        .filter(s => s.content)
        .map(s => ({
          filename: s.file.name,
          content: s.content!,
        }));

      const result = analyzer.analyzeFromContent(
        pcb.content,
        pcb.file.name,
        schematicFileContents
      );

      onFilesParsed(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to parse files';
      setParseError(message);
    }
  }, [onFilesParsed]);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    let newPcbFile = pcbFile;
    const newSchematicFiles = [...schematicFiles];

    for (const file of fileArray) {
      if (file.name.endsWith('.kicad_pcb')) {
        const content = await readFileContent(file);
        newPcbFile = {
          file,
          content,
          status: 'parsed',
        };
        onPcbFileChange(newPcbFile);
      } else if (file.name.endsWith('.kicad_sch')) {
        // Check if already added
        const exists = newSchematicFiles.some(f => f.file.name === file.name);
        if (!exists) {
          const content = await readFileContent(file);
          newSchematicFiles.push({
            file,
            content,
            status: 'parsed',
          });
        }
      }
    }

    onSchematicFilesChange(newSchematicFiles);

    // Process files if we have a PCB file
    if (newPcbFile?.content) {
      await processFiles(newPcbFile, newSchematicFiles);
    }
  }, [pcbFile, schematicFiles, onPcbFileChange, onSchematicFilesChange, processFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleRemovePcb = useCallback(() => {
    onPcbFileChange(null);
    setParseError(null);
  }, [onPcbFileChange]);

  const handleRemoveSchematic = useCallback((index: number) => {
    const newFiles = schematicFiles.filter((_, i) => i !== index);
    onSchematicFilesChange(newFiles);
    if (pcbFile?.content) {
      processFiles(pcbFile, newFiles);
    }
  }, [schematicFiles, onSchematicFilesChange, pcbFile, processFiles]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      {/* Dropzone */}
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".kicad_pcb,.kicad_sch"
          onChange={handleInputChange}
          className={styles.fileInput}
        />
        <div className={styles.dropzoneContent}>
          <span className={styles.icon}>&#128193;</span>
          <p className={styles.dropzoneText}>
            Drop KiCad files here or click to browse
          </p>
          <p className={styles.dropzoneHint}>
            .kicad_pcb and .kicad_sch files accepted
          </p>
        </div>
      </div>

      {/* File List */}
      {(pcbFile || schematicFiles.length > 0) && (
        <div className={styles.fileList}>
          {pcbFile && (
            <div className={styles.fileItem}>
              <span className={styles.fileIcon}>&#128196;</span>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{pcbFile.file.name}</span>
                <span className={styles.fileSize}>
                  ({formatFileSize(pcbFile.file.size)})
                </span>
              </div>
              <span className={`${styles.status} ${styles.statusParsed}`}>
                &#10003;
              </span>
              <button
                className={styles.removeButton}
                onClick={handleRemovePcb}
                aria-label="Remove file"
              >
                &times;
              </button>
            </div>
          )}

          {schematicFiles.map((file, index) => (
            <div key={file.file.name} className={styles.fileItem}>
              <span className={styles.fileIcon}>&#128196;</span>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.file.name}</span>
                <span className={styles.fileSize}>
                  ({formatFileSize(file.file.size)})
                </span>
              </div>
              <span className={`${styles.status} ${styles.statusParsed}`}>
                &#10003;
              </span>
              <button
                className={styles.removeButton}
                onClick={() => handleRemoveSchematic(index)}
                aria-label="Remove file"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Parse Error */}
      {parseError && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>&#9888;</span>
          {parseError}
        </div>
      )}
    </div>
  );
}
