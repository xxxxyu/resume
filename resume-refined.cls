\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{resume-refined}[2026/08/21 v0.1 conservative resume refinement]
\LoadClass[10pt,a4paper,fontset=none]{ctexart}

\RequirePackage{fontspec}
\RequirePackage{geometry}
\RequirePackage{enumitem}
\RequirePackage{xcolor}
\RequirePackage{hyperref}
\RequirePackage{tikz}
\RequirePackage{xparse}

\geometry{top=10.5mm,bottom=8mm,left=13mm,right=13mm}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\linespread{1.035}

\definecolor{ResumeInk}{HTML}{292825}
\definecolor{ResumeMuted}{HTML}{716D66}
\definecolor{ResumeBlue}{HTML}{315F78}
\definecolor{ResumeRed}{HTML}{A33A31}
\definecolor{ResumeRule}{HTML}{D7D2C9}
\definecolor{ResumeBluePale}{HTML}{E8EFF2}
\definecolor{ResumeRedPale}{HTML}{F4E8E5}

\defaultfontfeatures{Ligatures=TeX,Scale=MatchLowercase}
\setmainfont{Noto Sans SC}[Weight=400,BoldFont={Noto Sans SC},BoldFeatures={Weight=600}]
\setsansfont{Noto Sans SC}[Weight=400,BoldFont={Noto Sans SC},BoldFeatures={Weight=600}]
\setCJKmainfont{Noto Sans SC}[Weight=400,BoldFont={Noto Sans SC},BoldFeatures={Weight=600}]
\newfontfamily\ResumeSerif{Source Serif 4}[Weight=400,BoldFont={Source Serif 4},BoldFeatures={Weight=600}]
\newCJKfontfamily\ResumeCJKSerif{Noto Serif SC}[Weight=400,BoldFont={Noto Serif SC},BoldFeatures={Weight=600}]

\hypersetup{colorlinks=true,urlcolor=ResumeBlue,linkcolor=ResumeBlue}
\urlstyle{same}
\color{ResumeInk}

\setlist[itemize]{
  leftmargin=1.15em,
  label=\textcolor{ResumeBlue}{\raisebox{0.18ex}{\scriptsize\textbullet}},
  labelsep=0.42em,
  itemsep=1.05pt,
  parsep=0pt,
  topsep=1.8pt,
  partopsep=0pt
}

\AddToHook{shipout/background}{%
  \begin{tikzpicture}[remember picture,overlay]
    \fill[ResumeBluePale] (current page.north west) rectangle ++(4.2mm,-25mm);
    \fill[ResumeBlue] ([xshift=4.2mm]current page.north west) rectangle ++(0.7mm,-15mm);
    \fill[ResumeRedPale] ([xshift=-11mm,yshift=-7mm]current page.north east) rectangle ++(11mm,-4.2mm);
    \fill[ResumeRed] ([xshift=-11mm,yshift=-7mm]current page.north east) rectangle ++(2.4mm,-4.2mm);
    \fill[ResumeBluePale] ([xshift=-18mm]current page.south east) rectangle ++(18mm,3.2mm);
  \end{tikzpicture}%
}

\NewDocumentCommand{\ResumeHeader}{m m m m m}{%
  \begin{center}
    {\ResumeCJKSerif\fontsize{23}{25}\selectfont\bfseries #1}\par
    \vspace{0.6mm}
    {\ResumeSerif\fontsize{8.4}{9.3}\selectfont\bfseries\color{ResumeBlue}\addfontfeatures{LetterSpace=9}#2}\par
    \vspace{1.15mm}
    {\fontsize{9}{10.2}\selectfont\bfseries #3}\par
    \vspace{1.35mm}
    {\fontsize{7.65}{8.7}\selectfont\color{ResumeMuted} #4}\par
    \vspace{0.55mm}
    {\fontsize{7.65}{8.7}\selectfont\color{ResumeMuted} #5}
  \end{center}
  \vspace{0.7mm}
}

\NewDocumentCommand{\ResumeSection}{m m}{%
  \par\vspace{2.45mm}
  \noindent\begin{minipage}[b]{0.27\linewidth}
    {\fontsize{10.2}{11}\selectfont\bfseries\color{ResumeBlue}#1}
    \hspace{0.45em}{\ResumeSerif\fontsize{6.1}{7}\selectfont\bfseries\color{ResumeMuted}\addfontfeatures{LetterSpace=4}#2}
  \end{minipage}%
  \hspace{1.5mm}\raisebox{0.55ex}{\textcolor{ResumeRule}{\rule{\dimexpr0.73\linewidth-1.5mm\relax}{0.45pt}}}\par
  \vspace{1mm}
}

\NewDocumentCommand{\ResumeItem}{m m m}{%
  \par\vspace{0.9mm}
  \noindent{\fontsize{9.15}{10.5}\selectfont\bfseries #1}%
  \if\relax\detokenize{#2}\relax\else
    {\fontsize{8.2}{9.4}\selectfont\color{ResumeMuted}\hspace{0.5em}|\hspace{0.5em}#2}%
  \fi
  \hfill{\fontsize{7.8}{8.9}\selectfont\color{ResumeMuted}\addfontfeatures{Numbers=Monospaced}#3}\par
}

\NewDocumentCommand{\ResumeLine}{m}{%
  {\fontsize{8.7}{10.8}\selectfont\raggedright #1\par}
}

\NewDocumentCommand{\Metric}{m}{\textcolor{ResumeRed}{\bfseries #1}}
\NewDocumentCommand{\Tag}{m}{{\color{ResumeBlue}\bfseries #1}}
\NewDocumentCommand{\Links}{m}{{\fontsize{7.55}{8.6}\selectfont\color{ResumeBlue}#1}}

\AtBeginDocument{\fontsize{8.7}{10.8}\selectfont}
