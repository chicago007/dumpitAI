import type { BoardWithProgress } from "@/actions/boards";
import { BoardListItem } from "@/components/boards/board-list-item";

interface BoardProgressListProps {
  boards: BoardWithProgress[];
}

export function BoardProgressList({ boards }: BoardProgressListProps) {
  if (boards.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        보드가 없습니다. 할 일을 묶어서 진행률을 확인해 보세요.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {boards.map((board) => (
        <BoardListItem key={board.id} board={board} />
      ))}
    </ul>
  );
}
