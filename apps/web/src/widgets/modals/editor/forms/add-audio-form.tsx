"use client";

import { Badge, Button, Checkbox, Input, Label } from "@synapse/ui/components";
import { Music, X } from "lucide-react";
import { useEffect, useState } from "react";

import { trpc } from "@/shared/api/trpc";

import { ModalActions, ModalBody } from "../../layout";
import { showToast } from "../../utils";

interface AddAudioFormProps {
	initialTags?: string[];
	onSuccess: () => void;
	preloadedFiles?: File[];
}

export function AddAudioForm({ initialTags = [], onSuccess, preloadedFiles = [] }: AddAudioFormProps) {
	const [title, setTitle] = useState("");
	const [tags, setTags] = useState<string[]>(initialTags);
	const [currentTag, setCurrentTag] = useState("");
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const [dragActive, setDragActive] = useState(false);
	const [makeTrack, setMakeTrack] = useState(false);

	const utils = trpc.useUtils();

	const uploadMutation = trpc.upload.formData.useMutation({
		onSuccess: () => {
			utils.content.getTags.invalidate();
			utils.content.getTagsWithContent.invalidate();
		},
	});

	useEffect(() => {
		if (preloadedFiles.length > 0) {
			setSelectedFiles(preloadedFiles);
		}
	}, [preloadedFiles]);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const files = Array.from(e.target.files);
			setSelectedFiles((prev) => [...prev, ...files]);
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
			const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("audio/"));
			setSelectedFiles((prev) => [...prev, ...files]);
		}
	};

	const handleRemoveFile = (index: number) => {
		setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
	};

	const handleAddTag = () => {
		const tag = currentTag.trim();
		if (tag && !tags.includes(tag)) {
			setTags([...tags, tag]);
			setCurrentTag("");
		}
	};

	const handleRemoveTag = (tag: string) => {
		setTags(tags.filter((t) => t !== tag));
	};

	const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			handleAddTag();
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (selectedFiles.length === 0) {
			showToast.error("Выберите хотя бы один аудиофайл");
			return;
		}

		try {
			const filesPayload = await Promise.all(
				selectedFiles.map(async (file) => ({
					name: file.name,
					type: file.type,
					size: file.size,
					content: Buffer.from(await file.arrayBuffer()).toString("base64"),
				}))
			);

			const result = await uploadMutation.mutateAsync({
				files: filesPayload,
				title: title || undefined,
				tags: tags && tags.length > 0 ? tags : undefined,
				makeTrack,
			});

			if (result.errors && result.errors.length > 0) {
				showToast.error(`Ошибки при загрузке: ${result.errors.join(", ")}`);
			} else {
				showToast.success(
					`${selectedFiles.length} ${selectedFiles.length === 1 ? "аудиофайл загружен" : "аудиофайлов загружено"}`
				);
			}

			onSuccess();
		} catch (error) {
			showToast.error(
				`Ошибка при загрузке: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
			);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="flex flex-col h-full">
			<ModalBody scrollable>
				<div className="space-y-4">
					{/* Title */}
					<div className="space-y-2">
						<label htmlFor="title" className="text-sm font-medium">
							Заголовок (необязательно)
						</label>
						<Input
							id="title"
							placeholder="Введите заголовок..."
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							disabled={uploadMutation.isPending}
						/>
					</div>

					{/* File Upload */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Аудиофайлы</label>
						<div
							onDragEnter={handleDrag}
							onDragLeave={handleDrag}
							onDragOver={handleDrag}
							onDrop={handleDrop}
							className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
								dragActive ? "border-primary bg-primary/5" : "border-border"
							}`}>
							<Music className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
							<p className="text-sm text-muted-foreground mb-2">Перетащите аудиофайлы сюда</p>
							<p className="text-xs text-muted-foreground mb-4">или</p>
							<label className="cursor-pointer">
								<span className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors inline-block">
									Выбрать файлы
								</span>
								<input
									type="file"
									multiple
									accept="audio/*"
									onChange={handleFileSelect}
									className="hidden"
									disabled={uploadMutation.isPending}
								/>
							</label>
						</div>

						{/* Selected Files */}
						{selectedFiles.length > 0 && (
							<div className="space-y-2 mt-4">
								{selectedFiles.map((file, index) => (
									<div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											<Music className="w-5 h-5 text-muted-foreground flex-shrink-0" />
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium truncate">{file.name}</p>
												<p className="text-xs text-muted-foreground">
													{(file.size / 1024 / 1024).toFixed(2)} MB
												</p>
											</div>
										</div>
										<button
											type="button"
											onClick={() => handleRemoveFile(index)}
											className="p-1 hover:bg-destructive/20 rounded transition-colors"
											disabled={uploadMutation.isPending}>
											<X className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Make Track Option */}
					<div className="flex items-center space-x-2">
						<Checkbox
							id="makeTrack"
							checked={makeTrack}
							onCheckedChange={(checked) => setMakeTrack(checked as boolean)}
							disabled={uploadMutation.isPending}
						/>
						<Label
							htmlFor="makeTrack"
							className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
							Создать трек в плейлисте
						</Label>
					</div>

					{/* Tags */}
					<div className="space-y-2">
						<label className="text-sm font-medium">Теги</label>
						<div className="flex flex-wrap gap-2">
							{tags.map((tag) => (
								<Badge key={tag} variant="secondary" className="flex items-center gap-1">
									{tag}
									<button
										type="button"
										onClick={() => handleRemoveTag(tag)}
										className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
										disabled={uploadMutation.isPending}>
										<X className="w-3 h-3" />
									</button>
								</Badge>
							))}
							<Input
								placeholder="+ Добавить тег"
								value={currentTag}
								onChange={(e) => setCurrentTag(e.target.value)}
								onKeyDown={handleTagKeyDown}
								className="flex-1 min-w-[120px]"
								disabled={uploadMutation.isPending}
							/>
						</div>
					</div>
				</div>
			</ModalBody>

			<div className="p-6 pt-4 border-t bg-background flex-shrink-0">
				<ModalActions position="right">
					<Button
						type="button"
						variant="outline"
						onClick={() => onSuccess()}
						disabled={uploadMutation.isPending}>
						Отмена
					</Button>
					<Button
						type="submit"
						disabled={uploadMutation.isPending || selectedFiles.length === 0}
						loading={uploadMutation.isPending}>
						{uploadMutation.isPending
							? `Загрузка ${selectedFiles.length} файлов...`
							: `Загрузить${selectedFiles.length > 0 ? ` (${selectedFiles.length})` : ""}`}
					</Button>
				</ModalActions>
			</div>
		</form>
	);
}
