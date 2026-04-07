"use client";

import { Badge, Button } from "@synapse/ui/components";
import { Upload, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { trpc } from "@/shared/api/trpc";

import { ModalActions, ModalBody } from "../../layout";

interface AddDocumentFormProps {
	initialTags?: string[];
	onSuccess: () => void;
}

const SUPPORTED_FORMATS = {
	"application/pdf": { ext: "PDF", icon: "📄" },
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: "DOCX", icon: "📝" },
	"application/epub+zip": { ext: "EPUB", icon: "📖" },
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: "XLSX", icon: "📊" },
	"application/vnd.ms-excel": { ext: "XLS", icon: "📊" },
	"text/csv": { ext: "CSV", icon: "📈" },
};

export function AddDocumentForm({ initialTags: _initialTags, onSuccess }: AddDocumentFormProps) {
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [dragActive, setDragActive] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const utils = trpc.useUtils();

	const importFileMutation = trpc.content.importFile.useMutation({
		onSuccess: () => {
			toast.success("Документ импортирован!");
			utils.content.getAll.invalidate();
			utils.content.getTags.invalidate();
			utils.content.getTagsWithContent.invalidate();
		},
		onError: (error) => {
			toast.error(`Ошибка: ${error.message}`);
		},
	});

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const files = Array.from(e.target.files);
			const validFiles = files.filter((file) => {
				const extension = file.name.toLowerCase().split(".").pop();
				const validExtensions = ["pdf", "docx", "epub", "xlsx", "xls", "csv"];
				return validExtensions.includes(extension || "");
			});

			if (validFiles.length !== files.length) {
				toast.error("Некоторые файлы имеют неподдерживаемый формат");
			}

			setSelectedFiles((prev) => [...prev, ...validFiles]);
		}
	};

	const handleDrag = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (e.type === "dragenter" || e.type === "dragover") {
			setDragActive(true);
		} else if (e.type === "dragleave") {
			setDragActive(false);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setDragActive(false);

		if (e.dataTransfer.files) {
			const files = Array.from(e.dataTransfer.files);
			const validFiles = files.filter((file) => {
				const extension = file.name.toLowerCase().split(".").pop();
				const validExtensions = ["pdf", "docx", "epub", "xlsx", "xls", "csv"];
				return validExtensions.includes(extension || "");
			});

			if (validFiles.length !== files.length) {
				toast.error("Некоторые файлы имеют неподдерживаемый формат");
			}

			setSelectedFiles((prev) => [...prev, ...validFiles]);
		}
	};

	const handleRemoveFile = (index: number) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const getFileInfo = (file: File) => {
		const format = SUPPORTED_FORMATS[file.type as keyof typeof SUPPORTED_FORMATS];
		return format || { ext: file.name.split(".").pop()?.toUpperCase() || "FILE", icon: "📄" };
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (selectedFiles.length === 0) {
			toast.error("Выберите файлы для загрузки");
			return;
		}

		setIsLoading(true);

		try {
			for (const file of selectedFiles) {
				const buffer = await file.arrayBuffer();

				await importFileMutation.mutateAsync({
					file: {
						name: file.name,
						type: file.type,
						size: file.size,
						buffer: Array.from(new Uint8Array(buffer)),
					},
				});
			}

			toast.success(
				`${selectedFiles.length} ${selectedFiles.length === 1 ? "документ импортирован" : "документов импортировано"}`
			);
			onSuccess();
		} catch (error) {
			toast.error(`Ошибка при загрузке: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col h-full">
			<ModalBody scrollable>
				<div className="space-y-4">
					{/* Info */}
					<div className="bg-muted/50 border border-border rounded-lg p-4">
						<h3 className="text-sm font-medium mb-2">Поддерживаемые форматы</h3>
						<div className="flex flex-wrap gap-2">
							{Object.values(SUPPORTED_FORMATS).map((format, idx) => (
								<Badge key={idx} variant="secondary" className="text-xs">
									{format.icon} {format.ext}
								</Badge>
							))}
						</div>
					</div>

					{/* File Upload */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Документы</label>
						<div
							onDragEnter={handleDrag}
							onDragLeave={handleDrag}
							onDragOver={handleDrag}
							onDrop={handleDrop}
							className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
								dragActive ? "border-primary bg-primary/5" : "border-border"
							}`}>
							<Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
							<p className="text-sm text-muted-foreground mb-2">Перетащите документы сюда</p>
							<p className="text-xs text-muted-foreground mb-4">или</p>
							<label className="cursor-pointer">
								<span className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-block">
									Выбрать файлы
								</span>
								<input
									type="file"
									multiple
									accept=".pdf,.docx,.epub,.xlsx,.xls,.csv"
									onChange={handleFileSelect}
									className="hidden"
									disabled={isLoading}
								/>
							</label>
						</div>

						{/* Selected Files */}
						{selectedFiles.length > 0 && (
							<div className="space-y-2 mt-4">
								{selectedFiles.map((file, index) => {
									const fileInfo = getFileInfo(file);
									return (
										<div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
											<div className="flex items-center gap-3 flex-1 min-w-0">
												<div className="text-2xl">{fileInfo.icon}</div>
												<div className="flex-1 min-w-0">
													<p className="text-sm font-medium truncate">{file.name}</p>
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														<span>{fileInfo.ext}</span>
														<span>•</span>
														<span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
													</div>
												</div>
											</div>
											<button
												type="button"
												onClick={() => handleRemoveFile(index)}
												className="p-1 hover:bg-destructive/20 rounded transition-colors"
												disabled={isLoading}>
												<X className="w-4 h-4" />
											</button>
										</div>
									);
								})}
							</div>
						)}
					</div>
				</div>
			</ModalBody>

			<div className="p-6 pt-4 border-t bg-background flex-shrink-0">
				<ModalActions position="right">
					<Button type="button" variant="outline" onClick={() => onSuccess()} disabled={isLoading}>
						Отмена
					</Button>
					<Button type="submit" disabled={isLoading || selectedFiles.length === 0} loading={isLoading}>
						{isLoading
							? `Импорт ${selectedFiles.length} файлов...`
							: `Импортировать${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}`}
					</Button>
				</ModalActions>
			</div>
		</form>
	);
}
