from pathlib import Path
import sys


def main() -> int:
    current_dir = Path(__file__).resolve().parent
    sys.path.append(str(current_dir))

    from app import train_model  # pylint: disable=import-outside-toplevel

    try:
        bundle = train_model()
        print("Training completed")
        print(f"Trained at: {bundle['trained_at']}")
        print(f"Training size: {bundle['training_size']}")
        return 0
    except Exception as exc:
        print(f"Training failed: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
