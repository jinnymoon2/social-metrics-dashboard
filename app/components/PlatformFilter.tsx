import { Platform } from "@/app/lib/types";

const platforms: Array<Platform | "All"> = [
  "All",
  "Instagram",
  "LinkedIn",
  "X",
  "OKKY"
];

type PlatformFilterProps = {
  selectedPlatform: Platform | "All";
  onChange: (platform: Platform | "All") => void;
};

export default function PlatformFilter({
  selectedPlatform,
  onChange
}: PlatformFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {platforms.map((platform) => {
        const isSelected = selectedPlatform === platform;

        return (
          <button
            key={platform}
            type="button"
            onClick={() => onChange(platform)}
            className={[
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              isSelected
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
            ].join(" ")}
          >
            {platform}
          </button>
        );
      })}
    </div>
  );
}
