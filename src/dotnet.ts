import { debug, info, warning } from "@actions/core";
import { exec } from "@actions/exec";
import { context } from "@actions/github";
import { which } from "@actions/io";

import { getPullRequestFiles } from "./files";

import type { ExecOptions } from "@actions/exec/lib/interfaces";

export interface FormatOptions {
  onlyChangedFiles: boolean;
  dryRun?: boolean;
  workspace?: string;
  folder?: string;
  exclude?: string;
}

function formatOnlyChangedFiles(onlyChangedFiles: boolean): boolean {
  if (onlyChangedFiles) {
    if (context.eventName === "issue_comment" || context.eventName === "pull_request") {
      return true;
    }

    warning("Formatting only changed files is available on the issue_comment and pull_request events only");

    return false;
  }

  return false;
}

export async function format(options: FormatOptions): Promise<boolean> {
  const execOptions: ExecOptions = {
    ignoreReturnCode: true,
  };

  const dotnetFormatOptions = ["format", "--check"];

  if (options.dryRun) {
    dotnetFormatOptions.push("--dry-run");
  }

  if (formatOnlyChangedFiles(options.onlyChangedFiles)) {
    const filesToCheck = await getPullRequestFiles();

    info(`Checking ${filesToCheck.length} files`);

    // if there weren't any files to check then we need to bail
    if (!filesToCheck.length) {
      debug("No files found for formatting");
      return false;
    }

    dotnetFormatOptions.push("--files", filesToCheck.join(","));
  }

  if (options.folder !== undefined && options.folder != "") {
    dotnetFormatOptions.push("--folder", options.folder);
  } else if (options.workspace !== undefined && options.workspace != "") {
    dotnetFormatOptions.push("--workspace", options.workspace);
  }

  if (options.exclude !== undefined && options.exclude != "") {
    dotnetFormatOptions.push("--exclude", options.exclude);
  } 

  const dotnetPath: string = await which("dotnet", true);
  const dotnetResult = await exec(`"${dotnetPath}"`, dotnetFormatOptions, execOptions);

  return !!dotnetResult;
}
