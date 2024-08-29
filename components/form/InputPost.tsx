"use client";

import React, { useState, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Button } from "../ui/Button";
import OutlineIcon from "../icons/OutlineIcon";
import { CldUploadWidget } from "next-cloudinary";
import GroupCategory from "../group/GroupCategory";
import { Editor } from "@tinymce/tinymce-react";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { toast } from "../ui/use-toast";
import { usePostContract } from "@/hooks/contracts/usePostContract";
import { FormControl, FormItem, FormMessage } from "../ui/form";
import { Form } from "../ui/form"; // Add this import

// Update PostSchema to include new fields
const PostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  contents: z.string().min(1, "Content is required"),
  tags: z.array(z.string()),
  groupId: z.string(),
  isPremium: z.boolean(),
  premiumPrice: z.number().min(0),
  postType: z.enum(["regular", "poll", "challenge"]),
  pollOptions: z.array(z.string()).optional(),
  challengeDeadline: z.date().optional(),
});

type PostFormData = z.infer<typeof PostSchema>;


export function InputPost({ editDetail, title }: { editDetail?: string; title?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const parsedDetail = editDetail && JSON.parse(editDetail || "");
  const groupedTags = parsedDetail?.tags.map((tag: any) => tag);

  const [coverUrl, setCoverUrl] = useState(parsedDetail?.image || "");
  const [expanded, setExpanded] = useState(0);
  const [create, setCreate] = useState("Post");
  const [theme, setTheme] = useState("light");

  const { useCreatePost, useUpdatePost } = usePostContract();
  const createPostMutation = useCreatePost;
  const updatePostMutation = useUpdatePost;
  const editorRef = useRef<any>(null);

  const form = useForm<PostFormData>({
    resolver: zodResolver(PostSchema),
    defaultValues: {
      title: parsedDetail?.title || title || "",
      contents: parsedDetail?.content || "",
      tags: groupedTags || [],
      groupId: parsedDetail?.groupId || "",
      isPremium: false,
      premiumPrice: 0,
      postType: "regular",
      pollOptions: ["", ""],
      challengeDeadline: undefined,
    },
  });

  const onSubmit = async (values: PostFormData) => {
    setIsSubmitting(true);
    try {
      const postData = {
        ...values,
        image: coverUrl,
      };

      if (editDetail) {
        await updatePostMutation.mutateAsync({
          params: [parsedDetail?._id, postData]
        });
      } else {
        await createPostMutation.mutateAsync({
          params: [postData]
        });
      }

      toast({
        title: `${editDetail ? "Edited" : "Created"} Post`,
        variant: "default",
      });
      router.push("/");
    } catch (error) {
      console.error("Error creating/updating post:", error);
      if (error instanceof Error) {
        toast({
          title: "Error creating/updating post",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error creating/updating post",
          description: "An unknown error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>, field: any) => {
    if (e.key === "Enter" && field.name === "tags") {
      e.preventDefault();
      const tagInput = e.target as HTMLInputElement;
      const tagValue = tagInput.value.trim();
      if (tagValue !== "" && tagValue.length <= 15 && field.value.length < 5) {
        form.setValue("tags", [...field.value, tagValue]);
        tagInput.value = "";
      }
    }
  };

  const handleTagRemove = (tag: string, field: any) => {
    const newTags = field.value.filter((t: string) => t !== tag);
    form.setValue("tags", newTags);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="tabs tabs-boxed">
          <a 
            className={`tab ${form.watch("postType") === "regular" ? "tab-active" : ""}`}
            onClick={() => form.setValue("postType", "regular")}
          >
            Regular Post
          </a>
          <a 
            className={`tab ${form.watch("postType") === "poll" ? "tab-active" : ""}`}
            onClick={() => form.setValue("postType", "poll")}
          >
            Poll
          </a>
          <a 
            className={`tab ${form.watch("postType") === "challenge" ? "tab-active" : ""}`}
            onClick={() => form.setValue("postType", "challenge")}
          >
            Challenge
          </a>
        </div>

        <Controller
          name="title"
          control={form.control}
          render={({ field }) => (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Title</span>
              </label>
              <input type="text" placeholder="Enter your post title" className="input input-bordered" {...field} />
            </div>
          )}
        />

        <Controller
          name="contents"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Editor
                  onEditorChange={(content) => field.onChange(content)}
                  apiKey={process.env.NEXT_PUBLIC_TINY_EDITOR_API_KEY}
                  onInit={(evt, editor) => editorRef.current = editor}
                  key={theme}
                  initialValue={parsedDetail?.content || `Tell your story...`}
                  init={{
                    height: 376,
                    menubar: false,
                    plugins: [
                      "advlist", "autolink", "lists", "link", "image", "charmap", "print",
                      "preview", "anchor", "searchreplace", "visualblocks", "code",
                      "fullscreen", "insertdatetime", "media", "table", "paste", "code",
                      "help", "wordcount",
                    ],
                    toolbar_mode: "floating",
                    skin: theme === "dark" ? "oxide-dark" : "oxide",
                    toolbar:
                      "codeofconduct h1 bold italic underline strikethrough link image alignleft aligncenter " +
                      "alignright bullist numlist",
                    mobile: {
                      toolbar:
                        "h1 bold italic underline strikethrough link image alignleft aligncenter " +
                        "alignright bullist numlist",
                      toolbar_mode: "floating",
                    },
                    init_instance_callback: function (editor) {
                      editor.on("focus", function (e) {
                        const currentContent = editor.getContent();
                        if (currentContent === "<p>Tell your story...</p>") {
                          editor.setContent("");
                        }
                      });
                    },
                    content_css: theme === "dark" ? "dark" : "light",
                    setup: (editor) => {
                      editor.ui.registry.addButton("codeofconduct", {
                        text: "Code of Conduct",
                        onAction: () => {
                          window.open("/info/code-of-conduct", "_blank");
                        },
                      });
                    },
                  }}
                />
              </FormControl>
              <FormMessage className="text-red90" />
            </FormItem>
          )}
        />

        {form.watch("postType") === "poll" && (
          <Controller
            name="pollOptions"
            control={form.control}
            render={({ field }) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Poll Options</span>
                </label>
                {field.value?.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    className="input input-bordered mt-2"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...field.value!];
                      newOptions[index] = e.target.value;
                      field.onChange(newOptions);
                    }}
                  />
                ))}
                <button
                  type="button"
                  className="btn btn-secondary mt-2"
                  onClick={() => field.onChange([...field.value!, ""])}
                >
                  Add Option
                </button>
              </div>
            )}
          />
        )}

        {form.watch("postType") === "challenge" && (
          <Controller
            name="challengeDeadline"
            control={form.control}
            render={({ field }) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Challenge Deadline</span>
                </label>
                <input
                  type="date"
                  className="input input-bordered"
                  {...field}
                  value={field.value ? field.value.toISOString().split('T')[0] : ''}
                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                />
              </div>
            )}
          />
        )}

        <Controller
          name="tags"
          control={form.control}
          render={({ field }) => (
            <div className="form-control">
              <label className="label">
                <span className="label-text">Tags</span>
              </label>
              <input
                type="text"
                placeholder="Add a tag and press Enter (max 5 tags)"
                className="input input-bordered"
                onKeyDown={(e) => handleInputKeydown(e, field)}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {field.value.map((tag) => (
                  <div key={tag} className="badge badge-secondary gap-2">
                    {tag}
                    <button type="button" onClick={() => handleTagRemove(tag, field)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        />

        <Controller
          name="isPremium"
          control={form.control}
          render={({ field }) => (
            <div className="form-control">
              <label className="label cursor-pointer">
                <span className="label-text">Premium Post</span>
                <input type="checkbox" className="toggle toggle-primary" checked={field.value} onChange={field.onChange} />
              </label>
            </div>
          )}
        />

        {form.watch("isPremium") && (
          <Controller
            name="premiumPrice"
            control={form.control}
            render={({ field }) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Premium Price (in ETH)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered"
                  {...field}
                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                />
              </div>
            )}
          />
        )}

        <CldUploadWidget
          uploadPreset="ml_default"
          onUpload={(result: any) => {
            setCoverUrl(result.info.secure_url);
          }}
        >
          {({ open }) => {
            function handleOnClick(e: React.MouseEvent) {
              e.preventDefault();
              open();
            }
            return (
              <button className="btn btn-outline" onClick={handleOnClick}>
                Upload Cover Image
              </button>
            );
          }}
        </CldUploadWidget>

        {coverUrl && (
          <div className="mt-4">
            <img src={coverUrl} alt="Cover" className="max-h-60 rounded object-cover" />
          </div>
        )}

        <button
          type="submit"
          className={`btn btn-primary w-full ${isSubmitting || createPostMutation.isPending || updatePostMutation.isPending ? "loading" : ""}`}
          disabled={isSubmitting || createPostMutation.isPending || updatePostMutation.isPending}
        >
          {isSubmitting || createPostMutation.isPending || updatePostMutation.isPending
            ? "Submitting..."
            : editDetail ? "Update Post" : "Create Post"}
        </button>
      </form>
    </Form>
  );
}