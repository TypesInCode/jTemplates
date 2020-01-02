import { Component } from 'j-templates';
import { div } from 'j-templates/DOM';
import { Animation, Store, AnimationType, Destroy } from 'j-templates/Utils';

class AnimationComponent extends Component {

    @Destroy()
    animation: Animation;

    @Store()
    state = { top: 0 };

    public Template() {
        return div({ 
            props: { 
                style: { position: "relative", height: "300px" }
            },
            on: {
                click: () => this.AnimateDown()
            }
        }, () => 
            div({ 
                props: () => ({
                    style: {
                        position: "absolute",
                        top: `${this.state.top}%`
                    }
                }),
                text: "Hello world" 
            })
        );
    }

    public Bound() {
        super.Bound();
        this.animation = new Animation(AnimationType.Linear, 3000, (next) =>
            this.state = { top: next }
        );

        this.AnimateDown();
    }

    public AnimateDown() {
        this.animation.Animate(this.state.top, 100).then(() => 
            this.AnimateUp()
        );
    }

    public async AnimateUp() {
        this.animation.Animate(0, this.state.top).then(() => 
            this.AnimateDown()
        );
    }

}

var animation = Component.ToFunction("ani-mation", null, AnimationComponent);
Component.Attach(document.body, animation({}));
