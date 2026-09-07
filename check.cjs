"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/check-import-json.ts
var import_node_crypto = require("node:crypto");
var import_node_fs = require("node:fs");
var import_node_path = __toESM(require("node:path"));

// lib/admin/content-import-contract.ts
var CONTENT_IMPORT_SCHEMA_VERSION = "ezpz-content-import-v2";
var ALLOWED_DOCUMENT_KEYS = /* @__PURE__ */ new Set(["schemaVersion", "validationOnly", "items"]);
var ALLOWED_TRANSLATION_KEYS = /* @__PURE__ */ new Set(["questionText", "solutionText"]);
var ALLOWED_ITEM_KEYS = /* @__PURE__ */ new Set([
  "clientId",
  "curriculum",
  "questionNumber",
  "formatCode",
  "translations",
  "choices",
  "parts",
  "assets",
  "provenance",
  "sources",
  "enrichment"
]);
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function optionalConfidence(value, path2, issues) {
  if (value !== void 0 && (typeof value !== "number" || value < 0 || value > 1)) {
    issues.push({ path: path2, message: "Confidence must be a number from 0 to 1." });
  }
}
function validateContentImportDocument(rawValue) {
  const issues = [];
  const value = rawValue;
  if (!isObject(value)) {
    return { document: null, issues: [{ path: "$", message: "The JSON root must be an object." }] };
  }
  for (const key of Object.keys(value)) {
    if (!ALLOWED_DOCUMENT_KEYS.has(key)) {
      issues.push({ path: `$.${key}`, message: `Unknown key ${key}.` });
    }
  }
  if (value.schemaVersion !== CONTENT_IMPORT_SCHEMA_VERSION) {
    issues.push({
      path: "$.schemaVersion",
      message: `This document is not in the current format. Regenerate it as ${CONTENT_IMPORT_SCHEMA_VERSION}.`
    });
  }
  if (value.validationOnly !== void 0 && typeof value.validationOnly !== "boolean") {
    issues.push({ path: "$.validationOnly", message: "validationOnly must be true or false." });
  }
  if (!Array.isArray(value.items) || value.items.length === 0 || value.items.length > 500) {
    issues.push({ path: "$.items", message: "Provide between 1 and 500 items." });
    return { document: null, issues };
  }
  const clientIds = /* @__PURE__ */ new Set();
  value.items.forEach((rawItem, index) => {
    const path2 = `$.items[${index}]`;
    if (!isObject(rawItem)) {
      issues.push({ path: path2, message: "Each item must be an object." });
      return;
    }
    for (const key of Object.keys(rawItem)) {
      if (!ALLOWED_ITEM_KEYS.has(key)) {
        issues.push({ path: `${path2}.${key}`, message: `Unknown key ${key}.` });
      }
    }
    if (!nonEmpty(rawItem.clientId) || rawItem.clientId.length > 120) {
      issues.push({ path: `${path2}.clientId`, message: "clientId is required and may be at most 120 characters." });
    } else if (clientIds.has(rawItem.clientId)) {
      issues.push({ path: `${path2}.clientId`, message: "clientId must be unique inside the file." });
    } else clientIds.add(rawItem.clientId);
    if (!isObject(rawItem.curriculum)) {
      issues.push({ path: `${path2}.curriculum`, message: "Curriculum is required." });
    } else {
      const curriculum = rawItem.curriculum;
      for (const key of Object.keys(curriculum)) {
        if (key !== "path") {
          issues.push({ path: `${path2}.curriculum.${key}`, message: `Unknown key ${key}. Address a chapter by its code path.` });
        }
      }
      if (!nonEmpty(curriculum.path)) {
        issues.push({
          path: `${path2}.curriculum.path`,
          message: "Give a curriculum code path such as hsc/physics/1st/ch02."
        });
      } else if (!/^[a-z0-9][a-z0-9_/-]*$/.test(curriculum.path)) {
        issues.push({ path: `${path2}.curriculum.path`, message: "A curriculum path is lowercase codes separated by /." });
      }
    }
    if (!nonEmpty(rawItem.questionNumber)) {
      issues.push({ path: `${path2}.questionNumber`, message: "questionNumber is required." });
    }
    if (!nonEmpty(rawItem.formatCode) || !/^[a-z][a-z0-9_]*$/.test(rawItem.formatCode)) {
      issues.push({
        path: `${path2}.formatCode`,
        message: "formatCode must name a row in problem_formats, for example mcq_single, cq, short_answer or numeric."
      });
    }
    const translations = isObject(rawItem.translations) ? rawItem.translations : null;
    if (!translations || !isObject(translations.en) && !isObject(translations.bn)) {
      issues.push({ path: `${path2}.translations`, message: "At least one English or Bengali translation is required." });
    } else {
      for (const locale of ["en", "bn"]) {
        const translation = translations[locale];
        if (translation === void 0) continue;
        if (!isObject(translation) || !nonEmpty(translation.questionText)) {
          issues.push({ path: `${path2}.translations.${locale}.questionText`, message: "Question text is required." });
        }
        if (isObject(translation)) {
          for (const key of Object.keys(translation)) {
            if (!ALLOWED_TRANSLATION_KEYS.has(key)) {
              issues.push({
                path: `${path2}.translations.${locale}.${key}`,
                message: `Unknown key ${key}. A translation carries questionText and solutionText; choices, parts and figures belong to the item.`
              });
            }
          }
        }
      }
    }
    const locales = translations ? ["en", "bn"].filter((locale) => isObject(translations[locale])) : [];
    if (rawItem.choices !== void 0) {
      if (!Array.isArray(rawItem.choices)) {
        issues.push({ path: `${path2}.choices`, message: "choices must be an array." });
      } else {
        const keys = /* @__PURE__ */ new Set();
        const ordinals = /* @__PURE__ */ new Set();
        let correct = 0;
        rawItem.choices.forEach((choice, choiceIndex) => {
          const choicePath = `${path2}.choices[${choiceIndex}]`;
          if (!isObject(choice)) {
            issues.push({ path: choicePath, message: "Each choice must be an object." });
            return;
          }
          if (!Number.isInteger(choice.ordinal) || Number(choice.ordinal) < 1) {
            issues.push({ path: `${choicePath}.ordinal`, message: "ordinal must be a positive integer." });
          } else if (ordinals.has(Number(choice.ordinal))) {
            issues.push({ path: `${choicePath}.ordinal`, message: "Choice ordinals must be unique." });
          } else ordinals.add(Number(choice.ordinal));
          if (!nonEmpty(choice.key)) {
            issues.push({ path: `${choicePath}.key`, message: "Every choice needs a key." });
          } else if (keys.has(choice.key)) {
            issues.push({ path: `${choicePath}.key`, message: "Choice keys must be unique." });
          } else keys.add(choice.key);
          if (typeof choice.isCorrect !== "boolean") {
            issues.push({ path: `${choicePath}.isCorrect`, message: "isCorrect must be true or false." });
          } else if (choice.isCorrect) correct += 1;
          if (!isObject(choice.body)) {
            issues.push({ path: `${choicePath}.body`, message: "A choice body is required per locale." });
          } else {
            for (const locale of locales) {
              if (!nonEmpty(choice.body[locale])) {
                issues.push({
                  path: `${choicePath}.body.${locale}`,
                  message: `Choice text is required for every locale the item declares.`
                });
              }
            }
          }
        });
        if (rawItem.formatCode === "mcq_single" && correct !== 1) {
          issues.push({ path: `${path2}.choices`, message: "An mcq_single question needs exactly one correct choice." });
        }
      }
    }
    if (rawItem.parts !== void 0) {
      if (!Array.isArray(rawItem.parts)) {
        issues.push({ path: `${path2}.parts`, message: "parts must be an array." });
      } else {
        const keys = /* @__PURE__ */ new Set();
        rawItem.parts.forEach((part, partIndex) => {
          const partPath = `${path2}.parts[${partIndex}]`;
          if (!isObject(part)) {
            issues.push({ path: partPath, message: "Each part must be an object." });
            return;
          }
          if (!Number.isInteger(part.ordinal) || Number(part.ordinal) < 1) {
            issues.push({ path: `${partPath}.ordinal`, message: "ordinal must be a positive integer." });
          }
          if (!nonEmpty(part.key)) {
            issues.push({ path: `${partPath}.key`, message: "Every part needs a key." });
          } else if (keys.has(part.key)) {
            issues.push({ path: `${partPath}.key`, message: "Part keys must be unique." });
          } else keys.add(part.key);
          if (!isObject(part.prompt)) {
            issues.push({ path: `${partPath}.prompt`, message: "A part prompt is required per locale." });
          } else {
            for (const locale of locales) {
              if (!nonEmpty(part.prompt[locale])) {
                issues.push({
                  path: `${partPath}.prompt.${locale}`,
                  message: "Part text is required for every locale the item declares."
                });
              }
            }
          }
        });
      }
    }
    if (rawItem.assets !== void 0) {
      if (!Array.isArray(rawItem.assets)) {
        issues.push({ path: `${path2}.assets`, message: "assets must be an array." });
      } else rawItem.assets.forEach((asset, assetIndex) => {
        const assetPath = `${path2}.assets[${assetIndex}]`;
        if (!isObject(asset) || typeof asset.sha256 !== "string" || !/^[0-9a-f]{64}$/.test(asset.sha256)) {
          issues.push({ path: `${assetPath}.sha256`, message: "Every asset needs the sha256 of its uploaded bytes." });
        }
        if (asset && isObject(asset) && asset.locale !== void 0 && asset.locale !== "en" && asset.locale !== "bn") {
          issues.push({ path: `${assetPath}.locale`, message: "An asset locale is en or bn." });
        }
      });
    }
    if (rawItem.provenance !== void 0) {
      if (!isObject(rawItem.provenance)) {
        issues.push({ path: `${path2}.provenance`, message: "provenance must be an object." });
      } else {
        const provenance = rawItem.provenance;
        if (provenance.sourceDocumentSha256 !== void 0 && (typeof provenance.sourceDocumentSha256 !== "string" || !/^[0-9a-f]{64}$/.test(provenance.sourceDocumentSha256))) {
          issues.push({
            path: `${path2}.provenance.sourceDocumentSha256`,
            message: "sourceDocumentSha256 must be a sha256 hex digest."
          });
        }
        optionalConfidence(provenance.confidence, `${path2}.provenance.confidence`, issues);
      }
    }
    if (!Array.isArray(rawItem.sources) || rawItem.sources.length === 0) {
      issues.push({ path: `${path2}.sources`, message: "At least one board or admission source occurrence is required." });
    } else rawItem.sources.forEach((source, sourceIndex) => {
      const sourcePath = `${path2}.sources[${sourceIndex}]`;
      if (!isObject(source) || source.source_type !== "board_exam" && source.source_type !== "admission_exam") {
        issues.push({ path: `${sourcePath}.source_type`, message: "source_type must be board_exam or admission_exam." });
        return;
      }
      if (!nonEmpty(source.organization) && !nonEmpty(source.organization_id)) {
        issues.push({ path: `${sourcePath}.organization`, message: "Use a known organization name, alias, or organization_id." });
      }
      if (!Number.isInteger(source.year) || Number(source.year) < 1900 || Number(source.year) > 2200) {
        issues.push({ path: `${sourcePath}.year`, message: "Source year must be between 1900 and 2200." });
      }
      if (source.exam_category_code !== void 0 && (!nonEmpty(source.exam_category_code) || !/^[a-z][a-z0-9_]*$/.test(source.exam_category_code))) {
        issues.push({
          path: `${sourcePath}.exam_category_code`,
          message: "exam_category_code must name a row in content_exam_categories."
        });
      }
    });
    if (isObject(rawItem.enrichment)) {
      if (isObject(rawItem.enrichment.difficulty)) {
        if (!["easy", "medium", "hard"].includes(String(rawItem.enrichment.difficulty.value))) {
          issues.push({ path: `${path2}.enrichment.difficulty.value`, message: "Difficulty must be easy, medium, or hard." });
        }
        optionalConfidence(rawItem.enrichment.difficulty.confidence, `${path2}.enrichment.difficulty.confidence`, issues);
      }
      if (isObject(rawItem.enrichment.topics)) {
        optionalConfidence(rawItem.enrichment.topics.confidence, `${path2}.enrichment.topics.confidence`, issues);
        if (rawItem.enrichment.topics.existingTopicIds !== void 0 && (!Array.isArray(rawItem.enrichment.topics.existingTopicIds) || rawItem.enrichment.topics.existingTopicIds.some((id) => !nonEmpty(id)))) {
          issues.push({ path: `${path2}.enrichment.topics.existingTopicIds`, message: "Existing topics must be an array of topic UUIDs." });
        }
        if (rawItem.enrichment.topics.missingTopic !== void 0) {
          const proposal = rawItem.enrichment.topics.missingTopic;
          if (!isObject(proposal) || !nonEmpty(proposal.nameEn) || !nonEmpty(proposal.rationale)) {
            issues.push({ path: `${path2}.enrichment.topics.missingTopic`, message: "A missing-topic proposal needs nameEn and rationale." });
          }
        }
      }
    }
  });
  return { document: issues.length === 0 ? value : null, issues };
}

// scripts/check-import-json.ts
var reference = JSON.parse(
  (0, import_node_fs.readFileSync)(import_node_path.default.join(__dirname, "import-json", "reference.json"), "utf8")
);
function sha256(file) {
  return (0, import_node_crypto.createHash)("sha256").update((0, import_node_fs.readFileSync)(file)).digest("hex");
}
function bengaliInsideMath(text) {
  let inMath = false;
  let buffer = "";
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === "$") {
      if (text[i + 1] === "$") i += 1;
      if (inMath && /[\u0980-\u09FF]/.test(buffer)) return true;
      inMath = !inMath;
      buffer = "";
    } else if (inMath) buffer += text[i];
  }
  return false;
}
function normalizeName(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
var knownOrganizations = /* @__PURE__ */ new Set();
for (const org of reference.organizations) {
  knownOrganizations.add(normalizeName(org.code));
  if (org.name) knownOrganizations.add(normalizeName(org.name));
  for (const alias of org.aliases) knownOrganizations.add(normalizeName(alias));
}
var categoryByCode = new Map(reference.examCategories.map((c) => [c.code, c]));
var formatByCode = new Map(reference.formats.map((f) => [f.code, f]));
function checkItem(item, index, assetDir) {
  const issues = [];
  const p = `$.items[${index}]`;
  const E = (where, message) => issues.push({ level: "E", path: where, message });
  const W = (where, message) => issues.push({ level: "W", path: where, message });
  if (!reference.curriculumPaths[item.curriculum.path]) {
    E(`${p}.curriculum.path`, `Unknown curriculum path. See the list in docs/IMPORT-JSON-GUIDE.md.`);
  }
  const format = formatByCode.get(item.formatCode);
  const choices = item.choices ?? [];
  const parts = item.parts ?? [];
  const locales = Object.keys(item.translations);
  if (!format) {
    E(`${p}.formatCode`, `Unknown format. Use one of: ${[...formatByCode.keys()].join(", ")}.`);
  } else if (format.responseKind === "choice") {
    if (choices.length < (format.minChoices ?? 2)) E(`${p}.choices`, `${item.formatCode} needs at least ${format.minChoices ?? 2} choices.`);
    if (parts.length > 0) E(`${p}.parts`, `${item.formatCode} has no parts.`);
  } else if (format.responseKind === "structured") {
    if (parts.length === 0) E(`${p}.parts`, "A cq needs at least one part.");
    if (choices.length > 0) E(`${p}.choices`, "A cq has no choices.");
    for (const [i, part] of parts.entries()) {
      if (!part.solution) W(`${p}.parts[${i}].solution`, "No solution for this part.");
    }
  } else {
    if (choices.length > 0) E(`${p}.choices`, `${item.formatCode} has no choices.`);
    if (parts.length > 0) E(`${p}.parts`, `${item.formatCode} has no parts.`);
    for (const locale of locales) {
      if (!item.translations[locale]?.solutionText) {
        E(`${p}.translations.${locale}.solutionText`, `${item.formatCode} needs its answer in solutionText.`);
      }
    }
  }
  if (locales.length === 1) W(`${p}.translations`, `Only ${locales[0]} is present. The other language is missing.`);
  for (const locale of locales) {
    const t = item.translations[locale];
    if (!t) continue;
    if (t.solutionText === void 0) E(`${p}.translations.${locale}.solutionText`, "solutionText must be present. Use null when there is no solution.");
    else if (t.solutionText === null && format?.responseKind !== "text" && format?.responseKind !== "numeric") {
      W(`${p}.translations.${locale}.solutionText`, "No solution.");
    } else if (t.solutionText === "") E(`${p}.translations.${locale}.solutionText`, "Empty string is not allowed. Use null.");
    if (bengaliInsideMath(t.questionText)) W(`${p}.translations.${locale}.questionText`, "Bengali text inside $...$ will not render. Move it outside the math.");
  }
  if (!item.provenance) {
    E(`${p}.provenance`, "provenance is required: sourceDocumentSha256, page, extractorModel, promptVersion, confidence.");
  } else {
    for (const key of ["sourceDocumentSha256", "page", "extractorModel", "promptVersion", "confidence"]) {
      if (item.provenance[key] === void 0 || item.provenance[key] === null) E(`${p}.provenance.${key}`, `${key} is required.`);
    }
    if (typeof item.provenance.confidence === "number" && item.provenance.confidence < 0.8) {
      W(`${p}.provenance.confidence`, `Low confidence (${item.provenance.confidence}). Needs review.`);
    }
  }
  for (const [i, asset] of (item.assets ?? []).entries()) {
    if (!asset.role) W(`${p}.assets[${i}].role`, "No role. Defaults to stem.");
    if (assetDir) {
      const match = (0, import_node_fs.readdirSync)(assetDir).find((f) => f.startsWith(asset.sha256));
      if (!match) E(`${p}.assets[${i}].sha256`, `No file starting with this sha256 in ${assetDir}.`);
      else {
        const actual = sha256(import_node_path.default.join(assetDir, match));
        if (actual !== asset.sha256) E(`${p}.assets[${i}].sha256`, `File ${match} hashes to ${actual}, not the declared value.`);
      }
    }
  }
  for (const [i, source] of item.sources.entries()) {
    const sp = `${p}.sources[${i}]`;
    const category = source.exam_category_code ? categoryByCode.get(source.exam_category_code) : void 0;
    if (!source.exam_category_code) E(`${sp}.exam_category_code`, "exam_category_code is required.");
    else if (!category) E(`${sp}.exam_category_code`, `Unknown category. Use one of: ${[...categoryByCode.keys()].join(", ")}.`);
    else if (source.source_type === "board_exam" && category.code !== "board") E(`${sp}.exam_category_code`, "A board_exam source must use category board.");
    else if (source.source_type === "admission_exam" && category.parent !== "admission" && category.code !== "admission") {
      E(`${sp}.exam_category_code`, "An admission_exam source must use admission or one of its children: university, engineering, medical, dental.");
    }
    if (source.organization && !knownOrganizations.has(normalizeName(source.organization))) {
      W(`${sp}.organization`, `"${source.organization}" is not a known organization name or alias. The importer may still resolve it; check the spelling.`);
    }
    for (const key of ["exam_name", "session", "paper", "unit_name", "set_name", "source_item_reference"]) {
      if (source[key] === void 0) E(`${sp}.${key}`, `${key} must be present. Use null when it does not apply.`);
      else if (source[key] === "") E(`${sp}.${key}`, "Empty string is not allowed. Use null.");
    }
    if (source.source_type === "board_exam" && !source.paper) W(`${sp}.paper`, "Board exam without a paper (1st or 2nd).");
  }
  return issues;
}
function main() {
  const args = process.argv.slice(2);
  const hashAt = args.indexOf("--hash");
  if (hashAt >= 0) {
    const file2 = args[hashAt + 1];
    if (!file2 || !(0, import_node_fs.existsSync)(file2)) {
      console.error("Give a file to hash.");
      process.exit(2);
    }
    console.log(`${sha256(file2)}  ${import_node_path.default.basename(file2)}`);
    return;
  }
  const assetsAt = args.indexOf("--assets");
  const assetDir = assetsAt >= 0 ? args[assetsAt + 1] : null;
  const file = args.find((a) => !a.startsWith("--") && a !== assetDir);
  if (!file || !(0, import_node_fs.existsSync)(file)) {
    console.error("Usage: npm run check:import-json -- file.json [--assets dir] | --hash file");
    process.exit(2);
  }
  if (assetDir && !(0, import_node_fs.existsSync)(assetDir)) {
    console.error(`Asset directory not found: ${assetDir}`);
    process.exit(2);
  }
  let raw;
  try {
    raw = JSON.parse((0, import_node_fs.readFileSync)(file, "utf8"));
  } catch (error) {
    console.error(`Not valid JSON: ${error.message}`);
    process.exit(1);
  }
  const { document, issues: contractIssues } = validateContentImportDocument(raw);
  if (!document) {
    console.log(`${import_node_path.default.basename(file)}: rejected by the contract`);
    for (const issue of contractIssues) console.log(`  E ${issue.path}  ${issue.message}`);
    const rawItems = raw.items;
    if (Array.isArray(rawItems)) {
      console.log("\nFurther checks, best effort on the rejected file:");
      for (const [index, rawItem] of rawItems.entries()) {
        if (!rawItem || typeof rawItem !== "object") continue;
        try {
          for (const issue of checkItem(rawItem, index, assetDir)) {
            console.log(`  ${issue.level} ${issue.path}  ${issue.message}`);
          }
        } catch {
          console.log(`  E $.items[${index}]  Could not check this item until the errors above are fixed.`);
        }
      }
    }
    process.exit(1);
  }
  let errors = 0;
  let warnings = 0;
  for (const [index, item] of document.items.entries()) {
    const issues = checkItem(item, index, assetDir);
    const e = issues.filter((i) => i.level === "E").length;
    const w = issues.length - e;
    errors += e;
    warnings += w;
    console.log(`${item.clientId}: ${e === 0 && w === 0 ? "OK" : `${e} error(s), ${w} warning(s)`}`);
    for (const issue of issues) console.log(`  ${issue.level} ${issue.path}  ${issue.message}`);
  }
  console.log(`
${document.items.length} item(s), ${errors} error(s), ${warnings} warning(s). Reference data from ${reference.generatedAt}.`);
  process.exit(errors > 0 ? 1 : 0);
}
main();
