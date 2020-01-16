import { Component } from 'j-templates';
import { div, text } from 'j-templates/DOM';
import { Animation, Store, AnimationType, Destroy } from 'j-templates/Utils';

class AnimationComponent extends Component {

    @Destroy()
    animation: Animation;

    @Destroy()
    animation2: Animation;

    @Store()
    state: Partial<{ top: number, left: number }> = { top: 0, left: 0 };

    public Template() {
        return div({ 
            props: { 
                style: { position: "relative", height: "300px" }
            },
            on: {
                click: () => {
                    this.AnimateDown();
                    this.AnimateLeft();
                }
            }
        }, () => 
            div({ 
                props: () => ({
                    style: {
                        position: "absolute",
                        top: `${this.state.top}%`,
                        left: `${this.state.left}%`
                    }
                })
            }, () => text("Hello world"))
        );
    }

    public Bound() {
        super.Bound();
        this.animation = new Animation(AnimationType.Linear, 3000, (next) =>
            this.state = { top: next }
        );

        this.animation2 = new Animation(AnimationType.Linear, 3000, (next) => 
            this.state = { left: next }
        );

        this.AnimateDown();
        this.AnimateRight();
    }

    public AnimateRight() {
        this.animation2.Animate(this.state.left, 100).then(() => 
            this.AnimateLeft()
        );
    }

    public AnimateLeft() {
        this.animation2.Animate(this.state.left, 0).then(() => {
            this.AnimateRight()
        });
    }

    public AnimateDown() {
        this.animation.Animate(this.state.top, 100).then(() => 
            this.AnimateUp()
        );
    }

    public async AnimateUp() {
        this.animation.Animate(this.state.top, 0).then(() => 
            this.AnimateDown()
        );
    }

}

var animation = Component.ToFunction("ani-mation", null, AnimationComponent);
Component.Attach(document.body, animation({}));
