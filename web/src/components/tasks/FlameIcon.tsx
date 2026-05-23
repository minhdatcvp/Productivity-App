interface Props {
  className?: string;
}

export function FlameIcon({ className }: Props) {
  // Compound path with fill-rule="evenodd":
  // - Outer flame: enclosed 1× → filled
  // - Inner hole:  enclosed 2× → transparent
  // - Inner small flame: enclosed 3× → filled
  const d = [
    // Outer flame silhouette (left arm sweep + tall right body)
    "M 32 126",
    "C 10 120 8 90 16 65",
    "C 20 50 28 36 38 21",
    "C 41 13 43 6 44 2",
    "C 47 -1 54 3 58 13",
    "C 68 29 80 57 79 81",
    "C 78 102 67 119 70 126",
    "C 62 133 40 133 32 126 Z",

    // Inner hollow (creates the open centre)
    "M 50 57",
    "C 43 65 37 80 39 94",
    "C 41 107 45 118 50 118",
    "C 55 118 59 107 61 94",
    "C 63 80 57 65 50 57 Z",

    // Small inner flame (sits inside hollow — 3× enclosure → filled)
    "M 47 103",
    "C 41 96 39 82 43 73",
    "C 45 67 48 63 50 61",
    "C 52 63 55 67 57 73",
    "C 61 82 59 96 53 103",
    "C 51 107 49 107 47 103 Z",
  ].join(" ");

  return (
    <svg
      viewBox="0 0 100 132"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="flame-icon-g"
          x1="50" y1="133" x2="50" y2="2"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%"   stopColor="#E84000" />
          <stop offset="38%"  stopColor="#FF7200" />
          <stop offset="75%"  stopColor="#FFBF00" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
      </defs>

      <path
        d={d}
        fill="url(#flame-icon-g)"
        fillRule="evenodd"
      />
    </svg>
  );
}
