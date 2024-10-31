import { JsonDecoder } from "ts.data.json";
import { TaskDefinition } from "vscode";

export interface MiseTaskSummary {
  name: string;
  source: string;
  description: string;
}

export interface MiseTask {
  name: string;
  hide: boolean;
  sources: string[];
}

export const MiseTaskSummaryDecoder = JsonDecoder.object<MiseTaskSummary>(
  {
    name: JsonDecoder.string,
    source: JsonDecoder.string,
    description: JsonDecoder.string,
  },
  "MiseTaskSummary"
);

export const MiseTaskSummariesDecoder = JsonDecoder.array(
  MiseTaskSummaryDecoder,
  "MiseTaskSummary[]"
);

export const MiseTaskDecoder = JsonDecoder.object<MiseTask>(
  {
    name: JsonDecoder.string,
    hide: JsonDecoder.boolean,
    sources: JsonDecoder.array(JsonDecoder.string, "sources[]"),
  },
  "MiseTask"
);

export interface MiseTaskDefinition extends TaskDefinition {
  readonly type: "mise";
  readonly task: string | string[];
  readonly watch?: boolean;
}

export const MiseTaskDefinitionDecoder = JsonDecoder.object<MiseTaskDefinition>(
  {
    type: JsonDecoder.isExactly("mise"),
    task: JsonDecoder.oneOf<string | string[]>(
      [JsonDecoder.string, JsonDecoder.array(JsonDecoder.string, "task")],
      "task"
    ),
    watch: JsonDecoder.optional(JsonDecoder.boolean),
  },
  "MiseTask"
);
