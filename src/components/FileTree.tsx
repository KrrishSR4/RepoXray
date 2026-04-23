import { useMemo, useState } from "react";
import type { TreeEntry, StructureNote } from "@/types/analysis";
import { ChevronRight, File, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface Node {
  name: string;
  path: string;
  type: "tree" | "blob";
  children: Node[];
}

function buildTree(entries: TreeEntry[]): Node {
  const root: Node = { name: "", path: "", type: "tree", children: [] };
  for (const e of entries) {
    const parts = e.path.split("/");
    let cur = root;
    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const type = isLast ? (e.type === "tree" ? "tree" : "blob") : "tree";
      let next = cur.children.find((c) => c.name === name);
      if (!next) {
        next = { name, path: parts.slice(0, i + 1).join("/"), type, children: [] };
        cur.children.push(next);
      }
      cur = next;
    }
  }
  const sort = (n: Node) => {
    n.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === "tree" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sort);
  };
  sort(root);
  return root;
}

export function FileTree({ tree, notes }: { tree: TreeEntry[]; notes: StructureNote[] }) {
  const root = useMemo(() => buildTree(tree), [tree]);
  const notesByPath = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notes) m.set(n.path.replace(/^\/+|\/+$/g, ""), n.note);
    return m;
  }, [notes]);

  return (
    <div className="rounded-xl border border-border bg-card p-2 text-sm">
      {root.children.map((c) => (
        <TreeNode key={c.path} node={c} depth={0} notesByPath={notesByPath} defaultOpen={true} />
      ))}
    </div>
  );
}

function TreeNode({
  node, depth, notesByPath, defaultOpen = false,
}: { node: Node; depth: number; notesByPath: Map<string, string>; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen && depth < 1);
  const note = notesByPath.get(node.path);

  if (node.type === "blob") {
    return (
      <div
        className="group flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <File className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px]">{node.name}</div>
          {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/50"
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <ChevronRight className={cn("mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        {open ? (
          <FolderOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        ) : (
          <Folder className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[13px]">{node.name}/</div>
          {note && <div className="mt-0.5 text-xs text-muted-foreground">{note}</div>}
        </div>
      </button>
      {open && (
        <div className="animate-in-soft">
          {node.children.map((c) => (
            <TreeNode key={c.path} node={c} depth={depth + 1} notesByPath={notesByPath} />
          ))}
        </div>
      )}
    </div>
  );
}
