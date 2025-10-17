import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, PlayCircle, FileText, Lock } from "lucide-react";
import { Navbar } from "@/components/Navbar";

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [lessons, setLessons] = useState<any[]>([]);
  const [currentLesson, setCurrentLesson] = useState<any>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contentUrl, setContentUrl] = useState<string>("");

  useEffect(() => {
    checkEnrollmentAndFetchCourse();
  }, [courseId]);

  useEffect(() => {
    if (currentLesson) {
      loadLessonContent();
    }
  }, [currentLesson]);

  const checkEnrollmentAndFetchCourse = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("id", courseId)
      .single();

    if (courseError || !courseData) {
      toast.error("Course not found");
      navigate("/dashboard");
      return;
    }

    setCourse(courseData);

    const { data: enrollmentData } = await supabase
      .from("enrollments")
      .select("*")
      .eq("course_id", courseId)
      .eq("user_id", user.id)
      .single();

    setIsEnrolled(!!enrollmentData || courseData.is_free);

    if (enrollmentData || courseData.is_free) {
      const { data: lessonsData, error: lessonsError } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (!lessonsError && lessonsData) {
        setLessons(lessonsData);
        if (lessonsData.length > 0) {
          setCurrentLesson(lessonsData[0]);
        }
      }
    }

    setLoading(false);
  };

  const loadLessonContent = async () => {
    if (!currentLesson?.content_url) return;

    const { data } = supabase.storage
      .from('course-content')
      .getPublicUrl(currentLesson.content_url);

    setContentUrl(data.publicUrl);
  };

  const handleEnrollFree = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("enrollments").insert({
      user_id: user.id,
      course_id: courseId,
      progress: 0,
    });

    if (error) {
      toast.error("Error enrolling in course");
    } else {
      toast.success("Successfully enrolled!");
      checkEnrollmentAndFetchCourse();
    }
  };

  const renderContent = () => {
    if (!currentLesson || !contentUrl) return null;

    const fileExt = currentLesson.content_url.split('.').pop()?.toLowerCase();

    if (['mp4', 'webm', 'ogg'].includes(fileExt)) {
      return (
        <video controls className="w-full rounded-lg" key={contentUrl}>
          <source src={contentUrl} type={`video/${fileExt}`} />
          Your browser does not support video playback.
        </video>
      );
    }

    if (fileExt === 'pdf') {
      return (
        <div className="w-full h-[600px] rounded-lg border flex items-center justify-center bg-muted">
          <div className="text-center">
            <FileText className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">PDF Document</p>
            <p className="text-muted-foreground mb-4">{currentLesson.title}</p>
            <Button onClick={() => window.open(contentUrl, '_blank')}>
              Open PDF in New Tab
            </Button>
          </div>
        </div>
      );
    }

    if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) {
      return (
        <img src={contentUrl} alt={currentLesson.title} className="w-full rounded-lg" />
      );
    }

    if (['mp3', 'wav'].includes(fileExt)) {
      return (
        <audio controls className="w-full">
          <source src={contentUrl} type={`audio/${fileExt}`} />
          Your browser does not support audio playback.
        </audio>
      );
    }

    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Preview not available for this file type.</p>
        <Button onClick={() => window.open(contentUrl, '_blank')} className="mt-4">
          Download File
        </Button>
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading course...</div>;
  }

  if (!isEnrolled && !course?.is_free) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-12 px-4 text-center">
          <Lock className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-4">Course Access Required</h2>
          <p className="text-muted-foreground mb-6">
            You need to enroll in this course to access the content.
          </p>
          <Button onClick={() => navigate("/explore")}>Browse Courses</Button>
        </div>
      </>
    );
  }

  if (course?.is_free && !isEnrolled) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-12 px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">{course.title}</h2>
          <p className="text-muted-foreground mb-6">{course.description}</p>
          <div className="mb-6">
            <span className="text-3xl font-bold text-green-600">FREE</span>
          </div>
          <Button onClick={handleEnrollFree} size="lg">
            Enroll Now - It's Free!
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <Button variant="ghost" onClick={() => navigate("/dashboard")} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>{currentLesson?.title || course?.title}</CardTitle>
                <CardDescription>{course?.category}</CardDescription>
              </CardHeader>
              <CardContent>
                {renderContent()}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>{lessons.length} lessons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <button
                      key={lesson.id}
                      onClick={() => setCurrentLesson(lesson)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        currentLesson?.id === lesson.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <PlayCircle className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {index + 1}. {lesson.title}
                          </p>
                          <p className="text-xs opacity-80">
                            {lesson.content_url?.split('.').pop()?.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
