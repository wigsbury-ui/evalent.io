import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Bot } from "lucide-react";

export default function PromptsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          AI Prompts
        </h1>
        <p className="mt-1 text-gray-500">
          Configure Claude system prompts and rubrics for writing evaluation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          {
            title: "English Writing Evaluation",
            desc: "System prompt for evaluating English extended writing tasks",
          },
          {
            title: "Mathematics Writing Evaluation",
            desc: "System prompt for evaluating mathematical reasoning explanations",
          },
          {
            title: "Values Writing Evaluation",
            desc: "System prompt for evaluating values/community reflective writing",
          },
          {
            title: "Creativity Writing Evaluation",
            desc: "System prompt for evaluating creative design responses",
          },
          {
            title: "Reasoning Narrative",
            desc: "System prompt for generating reasoning domain interpretation",
          },
          {
            title: "Mindset Interpretation",
            desc: "System prompt for interpreting mindset/readiness scores",
          },
        ].map((prompt) => (
          <Card key={prompt.title}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                  <Bot className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <CardTitle className="text-base">{prompt.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {prompt.desc}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-400">
                Prompt configuration will be available once the Claude API key
                is connected.
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
