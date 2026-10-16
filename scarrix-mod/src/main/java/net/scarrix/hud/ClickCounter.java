package net.scarrix.hud;

import java.util.ArrayDeque;

/** Physical clicks in the last second, with bounded storage and an injectable clock for tests. */
public final class ClickCounter {
    private final ArrayDeque<Long> left=new ArrayDeque<>(),right=new ArrayDeque<>();
    public void record(int button,long now) { if(button!=0 && button!=1)return; var q=button==0?left:right; prune(q,now);if(q.size()<1000)q.addLast(now); }
    public int count(int button,long now) { var q=button==0?left:right; prune(q,now);return q.size(); }
    private void prune(ArrayDeque<Long> q,long now) { while(!q.isEmpty() && now-q.peekFirst()>=1_000_000_000L)q.removeFirst(); }
}
