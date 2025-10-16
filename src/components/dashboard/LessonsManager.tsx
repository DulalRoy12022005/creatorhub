import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ArrowLeft, Upload, FileText } from "lucide-react";

export default function LessonsManager() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    file: null as File | null,
  });

  useEffect(() => {
    fetchCourseAndLessons();
  }, [courseId]);

  const fetchCourseAndLessons = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .eq("creator_id", user.id)
      .single();

    if (courseError || !courseData) {
      toast.error("Course not found");
      navigate("/dashboard");
      return;
    }

    setCourse(courseData);

    const { data: lessonsData, error: lessonsError } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseId)
      .order("order_index", { ascending: true });

    if (lessonsError) {
      toast.error("Error fetching lessons");
    } else {
      setLessons(lessonsData || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.file) {
      toast.error("Please select a file");
      return;
    }

    setUploading(true);

    try {
      const fileExt = formData.file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${courseId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('course-content')
        .upload(filePath, formData.file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('course-content')
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("lessons").insert({
        course_id: courseId,
        title: formData.title,
        content_url: filePath,
        order_index: lessons.length,
      });

      if (insertError) throw insertError;

      toast.success("Lesson uploaded successfully!");
      setDialogOpen(false);
      setFormData({ title: "", file: null });
      fetchCourseAndLessons();
    } catch (error: any) {
      toast.error(error.message || "Error uploading lesson");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, contentUrl: string) => {
    const { error: storageError } = await supabase.storage
      .from('course-content')
      .remove([contentUrl]);

    const { error } = await supabase.from("lessons").delete().eq("id", id);

    if (error) {
      toast.error("Error deleting lesson");
    } else {
      toast.success("Lesson deleted");
      fetchCourseAndLessons();
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading lessons...</div>;
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <h2 className="text-2xl font-semibold">{course?.title}</h2>
        <p className="text-muted-foreground">Manage course lessons and content</p>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold">Course Content</h3>
          <p className="text-sm text-muted-foreground">{lessons.length} lessons</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Lesson
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Lesson</DialogTitle>
              <DialogDescription>Upload video, PDF, or other course materials</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Lesson Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Content File</Label>
                <Input
                  id="file"
                  type="file"
                  accept="video/*,application/pdf,image/*,audio/*"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Accepted: Videos, PDFs, Images, Audio (Max 500MB)
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={uploading}>
                {uploading ? (
                  <>
                    <Upload className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Lesson
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {lessons.length === 0 ? (
        <Card className="shadow-soft">
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No lessons yet. Start adding content to your course.</p>
            <Button onClick={() => setDialogOpen(true)}>Add First Lesson</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lessons.map((lesson, index) => (
            <Card key={lesson.id} className="shadow-soft hover:shadow-hover transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground">
                        Lesson {index + 1}
                      </span>
                      <CardTitle className="text-lg">{lesson.title}</CardTitle>
                    </div>
                    <CardDescription className="mt-2">
                      {lesson.content_url?.split('.').pop()?.toUpperCase()} File
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(lesson.id, lesson.content_url)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
