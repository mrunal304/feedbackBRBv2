import { Star } from "lucide-react";

interface RatingStarsProps {
  rating: number;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "w-2.5 h-2.5",
  sm: "w-3 h-3",
  md: "w-4 h-4",
};

export default function RatingStars({
  rating,
  size = "xs",
  showLabel = false,
  className = "",
}: RatingStarsProps) {
  const clampedRating = Math.max(0, Math.min(5, rating));
  const sizeClass = sizeMap[size];

  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const fillPercentage = Math.max(
            0,
            Math.min(1, clampedRating - starIndex + 1)
          );
          const isFilled = fillPercentage === 1;
          const isPartial = fillPercentage > 0 && fillPercentage < 1;
          const isEmpty = fillPercentage === 0;

          return (
            <div key={starIndex} className="relative inline-flex">
              {/* Empty star background */}
              <Star className={`${sizeClass} text-gray-200`} />

              {/* Filled/partial star overlay */}
              {(isFilled || isPartial) && (
                <div
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{
                    width: `${fillPercentage * 100}%`,
                  }}
                >
                  <Star className={`${sizeClass} fill-amber-400 text-amber-400`} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showLabel && (
        <span className="font-bold text-amber-600 text-sm ml-1">
          {clampedRating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
