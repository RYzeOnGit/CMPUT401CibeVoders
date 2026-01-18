These are the 3 resume templates

1: (modern-deedy) https://www.overleaf.com/latex/templates/modern-deedy/cxtjgrmpsrvh
2: (JayDeep's CV) https://www.overleaf.com/articles/jaydeeps-cv/vdkxtzrbbyzn
3: (Jakes Resume) https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs

## Template-2 File Structure and Connections

Template-2 consists of several interconnected TeX files. Here's how they work together:

### Main Document Structure

**`mmayer.tex`** is the main document file. It:

1. **Uses the `altacv` class** (line 1):
   ```latex
   \documentclass[10pt,a4paper,ragged2e]{altacv}
   ```

2. **References the bibliography file** (line 19):
   ```latex
   \addbibresource{sample.bib}
   ```

3. **Includes sidebar content** via the `\cvsection` command (line 51):
   ```latex
   \cvsection[page1sidebar]{Experience}
   ```
   The optional `[page1sidebar]` argument tells LaTeX to include `page1sidebar.tex` in the margin sidebar.

### How the Sidebar System Works

In **`altacv.cls`** (lines 176-181), the `\cvsection` command is defined as:
```latex
\newcommand{\cvsection}[2][]{%
  \bigskip%
  \ifstrequal{#1}{}{}{\marginpar{\vspace*{\dimexpr1pt-\baselineskip}\raggedright\input{#1}}}%
  ...
}
```

This means:
- If you provide an optional first argument (like `[page1sidebar]`), it will `\input` that file in the margin using `\marginpar`
- If you omit the optional argument, no sidebar content is added for that section

### Current File Usage

- **`page1sidebar.tex`** - Currently included on line 51 of `mmayer.tex`. Contains the Education and Projects sections that appear in the sidebar when the "Experience" section is displayed.

- **`page2sidebar.tex`** - Not currently used (line 139 in `mmayer.tex` is commented out). It would be included similarly if you uncomment that line and use it with a `\cvsection` command.

### File Dependency Diagram

```
mmayer.tex (main document)
  ├── Uses: altacv.cls (document class)
  ├── References: sample.bib (bibliography)
  ├── Includes: page1sidebar.tex (via \cvsection[page1sidebar])
  └── Available: page2sidebar.tex (currently unused)
```

The sidebar files are included via the optional argument to `\cvsection`, which the class file handles by using `\input` to place the content in the margin.